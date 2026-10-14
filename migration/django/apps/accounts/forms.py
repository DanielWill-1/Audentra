from django import forms


class LoginForm(forms.Form):
    email = forms.EmailField(
        max_length=254,
        widget=forms.EmailInput(attrs={"autocomplete": "email", "placeholder": "you@example.com"}),
    )
    password = forms.CharField(
        widget=forms.PasswordInput(
            attrs={"autocomplete": "current-password", "placeholder": "Enter your password"}
        ),
        strip=False,
    )
    remember_me = forms.BooleanField(required=False)


class SignupForm(forms.Form):
    first_name = forms.CharField(max_length=100)
    last_name = forms.CharField(max_length=100)
    email = forms.EmailField(max_length=254)
    password = forms.CharField(min_length=8, widget=forms.PasswordInput, strip=False)
    confirm_password = forms.CharField(widget=forms.PasswordInput, strip=False)
    accepted_terms = forms.BooleanField(
        required=True,
        label="I agree to the Terms of Service and Privacy Policy",
    )

    def clean(self) -> dict[str, object] | None:
        cleaned = super().clean()
        if cleaned and cleaned.get("password") != cleaned.get("confirm_password"):
            self.add_error("confirm_password", "Passwords do not match.")
        return cleaned


class ResetPasswordForm(forms.Form):
    password = forms.CharField(min_length=8, widget=forms.PasswordInput, strip=False)
    confirm_password = forms.CharField(widget=forms.PasswordInput, strip=False)

    def clean(self) -> dict[str, object] | None:
        cleaned = super().clean()
        if cleaned and cleaned.get("password") != cleaned.get("confirm_password"):
            self.add_error("confirm_password", "Passwords do not match.")
        return cleaned
