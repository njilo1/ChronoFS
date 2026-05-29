"""
FSChrono v2 — Configuration Django

Lit la majorité des paramètres sensibles depuis le fichier `.env`
(racine du projet) via `python-decouple`. Ne JAMAIS coder en dur les
secrets ici. Voir `.env.example` pour la liste des variables.
"""

from datetime import timedelta
from pathlib import Path

from decouple import Config, Csv, RepositoryEnv


# ── Chemins ───────────────────────────────────────────────────────────────────
BASE_DIR     = Path(__file__).resolve().parent.parent       # /backend
PROJECT_ROOT = BASE_DIR.parent                              # /ChronoFS

# Le fichier .env est à la racine du projet (au-dessus de backend/).
# On instancie nous-mêmes Config pour pointer explicitement dessus.
config = Config(RepositoryEnv(PROJECT_ROOT / '.env'))


# ── Sécurité ──────────────────────────────────────────────────────────────────
SECRET_KEY    = config('DJANGO_SECRET_KEY')
DEBUG         = config('DJANGO_DEBUG', cast=bool, default=False)
ALLOWED_HOSTS = config('DJANGO_ALLOWED_HOSTS', cast=Csv(), default='localhost,127.0.0.1')


# ── Applications ──────────────────────────────────────────────────────────────
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Tierces parties
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'drf_spectacular',

    # Application unique FSChrono v2
    'core',
]


MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF     = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'core' / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]


# ── Base de données ──────────────────────────────────────────────────────────
DATABASES = {
    'default': {
        'ENGINE':   'django.db.backends.postgresql',
        'NAME':     config('POSTGRES_DB'),
        'USER':     config('POSTGRES_USER'),
        'PASSWORD': config('POSTGRES_PASSWORD'),
        'HOST':     config('POSTGRES_HOST', default='localhost'),
        'PORT':     config('POSTGRES_PORT', default='5432'),
    }
}


# ── Utilisateur custom ───────────────────────────────────────────────────────
# Doit être défini avant la première migration. Une fois posé, ne plus changer.
AUTH_USER_MODEL = 'core.User'


# ── Validation mots de passe ─────────────────────────────────────────────────
# En dev (DEBUG=True), validators désactivés pour autoriser les mots de
# passe courts du seed (dar123, tic123…). Activés en production.
if DEBUG:
    AUTH_PASSWORD_VALIDATORS = []
else:
    AUTH_PASSWORD_VALIDATORS = [
        {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
        {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
        {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
        {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
    ]


# ── Internationalisation ─────────────────────────────────────────────────────
LANGUAGE_CODE = 'fr-fr'
TIME_ZONE     = 'Africa/Douala'
USE_I18N      = True
USE_TZ        = True


# ── Fichiers statiques et médias ─────────────────────────────────────────────
STATIC_URL  = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Uploads (imports Excel, exports PDF/DOCX archivés)
MEDIA_URL  = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'


DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# ── REST framework + JWT ─────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    # En dev on laisse permissif au niveau global, les permissions seront
    # déclarées par vue/par rôle dès la Phase 2 (auth + endpoints).
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',
    ),
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'core.pagination.StandardPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':  timedelta(
        minutes=config('JWT_ACCESS_TOKEN_LIFETIME_MINUTES', cast=int, default=60),
    ),
    'REFRESH_TOKEN_LIFETIME': timedelta(
        days=config('JWT_REFRESH_TOKEN_LIFETIME_DAYS', cast=int, default=7),
    ),
    'ROTATE_REFRESH_TOKENS': True,
    'AUTH_HEADER_TYPES':     ('Bearer',),
}


# ── CORS (autoriser le frontend Vite) ────────────────────────────────────────
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    cast=Csv(),
    default='http://localhost:5173',
)


# ── drf-spectacular (doc OpenAPI) ────────────────────────────────────────────
SPECTACULAR_SETTINGS = {
    'TITLE':       'FSChrono API',
    'DESCRIPTION': "API du logiciel d'emplois du temps de la FS-UEB.",
    'VERSION':     '2.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}


# ── Celery (désactivé tant que le solver est synchrone) ──────────────────────
USE_CELERY            = config('USE_CELERY', cast=bool, default=False)
CELERY_BROKER_URL     = config('CELERY_BROKER_URL',     default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = config('CELERY_RESULT_BACKEND', default='redis://localhost:6379/0')
