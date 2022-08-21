import functools
import re

from flask import (Blueprint, g, redirect, render_template, request,
                   session, url_for, flash)
from werkzeug.security import check_password_hash, generate_password_hash

from db import get_db

bp = Blueprint("auth", __name__, url_prefix="/auth")


def login_required(view):
    """View decorator that redirects anonymous users to the login page."""

    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if g.user is None:
            return redirect(url_for("auth.login"))

        return view(**kwargs)

    return wrapped_view


@bp.before_app_request
def load_logged_in_user():
    """If a user id is stored in the session, load the user object from
    the database into ``g.user``."""
    user_id = session.get("user_id")

    if user_id is None:
        g.user = None
    else:
        g.user = (
            get_db().execute("SELECT * FROM user WHERE id = ?", (user_id,)).fetchone()
        )


@bp.route("/register", methods=("GET", "POST"))
def register():
    """Register a new user.
    Validates that the username is not already taken. Hashes the
    password for security.
    """
    message = None
    if request.method == "POST":
        email = request.form["email"]
        password = request.form["password"]
        db = get_db()
        if message is None:
            try:
                db.execute(
                    "INSERT INTO user (email, password, exp) VALUES (?, ?, ?)",
                    (email, generate_password_hash(password), 0),
                )
                db.commit()
                flash("Account successfully created.")
            except db.IntegrityError:
                # The email was already taken, which caused the
                # commit to fail. Show a validation error.
                message = f"This email already exists."
            else:
                # Success, go to the index page.
                return redirect(url_for("auth.login"))
    return render_template("auth/register.html", message=message)


@bp.route("/login", methods=("GET", "POST"))
def login():
    """Log in a registered user by adding the user id to the session."""
    message = None
    if g.user != None:
        return redirect(url_for("task"))

    if request.method == "POST":
        email = request.form["email"]
        password = request.form["password"]
        db = get_db()
        user = db.execute(
            "SELECT * FROM user WHERE email = ?", (email,)
        ).fetchone()

        if email and password:
            if user is None or not check_password_hash(user["password"], password):
                message = "You have entered an invalid email or password."

            if message is None:
                # store the user id in a new session and return to the index
                session.clear()
                session["user_id"] = user["id"]
                return redirect(url_for("task"))

    return render_template("auth/login.html", message=message)


@bp.route("/reset", methods=("GET", "POST"))
def reset_password():

    message = None
    if request.method == "POST":
        email = request.form["email"]
        password = request.form["password"]
        db = get_db()

        if email and password:

            # Attempt to find user with email
            user = db.execute(
                "SELECT * FROM user WHERE email = ?", (email,)
            ).fetchone()
            if user is None:
                message = "This email doesn't exist."

            else:
                db.execute(
                    "UPDATE user SET password = ? WHERE email = ?",
                    (generate_password_hash(password), email),
                )
                db.commit()
                message = "Password reset was successful"

    return render_template("auth/reset.html", message=message)


@bp.route("/logout")
def logout():
    """Clear the current session, including the stored user id."""
    session.clear()
    flash("Logout successful.")
    return redirect(url_for("auth.login"))