"""Pagination FSChrono : 20 par défaut, surchargeable via ?page_size=."""

from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """
    Pagination par défaut (20/page) mais le client peut demander une autre
    taille via `?page_size=N` (plafonné). Pratique pour alimenter des listes
    déroulantes qui ont besoin de TOUS les éléments (ex. les 28 salles dans
    la modale d'édition d'une séance) sans boucler sur les pages.
    """

    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 500
