from django.urls import path

from apps.accounts import views

urlpatterns = [
    path("login/", views.login, name="login"),
    path("signup/", views.signup, name="signup"),
    path("forgot-password/", views.forgot_password, name="forgot-password"),
    path("change-password/", views.change_password, name="change-password"),
    path("auth/session/", views.session_proof, name="auth-session"),
    path("logout/", views.logout, name="logout"),
]
