from django.urls import path, re_path

from apps.accounts import views

urlpatterns = [
    re_path(r"^login/?$", views.login, name="login"),
    re_path(r"^signup/?$", views.signup, name="signup"),
    re_path(r"^forgot-password/?$", views.forgot_password, name="forgot-password"),
    re_path(r"^reset-password/?$", views.reset_password, name="reset-password"),
    re_path(r"^change-password/?$", views.change_password, name="change-password"),
    path("auth/session/", views.session_proof, name="auth-session"),
    path("logout/", views.logout, name="logout"),
]
