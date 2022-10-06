import os
import json
from flask import Flask, request, render_template, g, session, jsonify, redirect, url_for


# Allows for undo functionality
recently_deleted_task = None


def create_app(test_config=None):
    """Create and configure an instance of the Flask application."""
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        # a default secret that should be overridden by instance config
        SECRET_KEY="dev",
        # store the database in the instance folder
        DATABASE=os.path.join(app.instance_path, "flaskr.sqlite"),
    )

    if test_config is None:
        # load the instance config, if it exists, when not testing
        app.config.from_pyfile("config.py", silent=True)
    else:
        # load the test config if passed in
        app.config.update(test_config)

    # ensure the instance folder exists
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    @app.route("/")
    def root():
        return redirect(url_for("auth.login"))

    @app.route("/profile", methods=["GET"])
    def profile():
        if request.method == "GET":
            connection = db.get_db()
            cursor = connection.cursor()
            exp = cursor.execute(
                "SELECT exp FROM user WHERE id = ?", str(g.user["id"])).fetchone()

            return render_template("profile.html", exp=exp["exp"], tab='profile')

    # register the database commands
    import db

    db.init_app(app)

    # apply the blueprints to the app
    import auth

    app.register_blueprint(auth.bp)

    @app.route("/task", methods=["GET", "POST"])
    def task():
        if g.user == None:
            return redirect(url_for("auth.login"))

        # Initialize Variables
        taskName = None
        taskId = None

        connection = db.get_db()
        cursor = connection.cursor()

        if request.method == "POST" and not request.data == b"":
            postData = json.loads(request.data.decode('utf-8'))

            if postData["event"] == "delete":
                taskId = postData['id']
                global recently_deleted_task
                recently_deleted_task = cursor.execute(
                    f"SELECT * FROM tasks WHERE id='{taskId}';",
                ).fetchone()
                cursor.execute(
                    f"DELETE FROM tasks WHERE id='{taskId}';",
                )
                connection.commit()
                print(f"Task id {taskId} has been deleted")

            elif postData["event"] == "undo" and recently_deleted_task is not None:
                return {
                    'task-name': recently_deleted_task["task_name"],
                    'total-seconds': recently_deleted_task["total_seconds"]
                }

            elif postData["event"] == "update":
                cursor.execute(
                    f"UPDATE user SET exp = exp + {postData['exp']} WHERE {session.get('user_id')}")
                connection.commit()
                print(f"Experience has been updated")

            elif postData['event'] == "add":
                taskName = postData['task-name']
                totalSeconds = postData['total-seconds']
                try:
                    cursor.execute(
                        "INSERT INTO tasks (user_id, task_name, total_seconds) VALUES (?, ?, ?)",
                        (session.get("user_id"), taskName, totalSeconds),
                    )
                    connection.commit()

                    created_taskid = cursor.execute(
                        "SELECT MAX(id) from tasks",).fetchone()[0]
                    newTask = {
                        'task-id': created_taskid,
                        'task-name': taskName,
                        'total-seconds': totalSeconds,
                        'error': 0
                    }

                    return jsonify(newTask)

                except Exception as e:
                    print(e)
                    return jsonify({"error": 1})

            elif postData['event'] == "save_elasped_time":
                task_id = postData['id']
                elasped_seconds = postData['elasped-seconds']
                try:
                    cursor.execute(
                        f"UPDATE tasks SET elasped_seconds = {elasped_seconds} WHERE id = {task_id}"
                    )
                    connection.commit()
                    print(
                        f"Updated task {task_id}'s elasped seconds to {elasped_seconds}")
                except Exception as e:
                    print(e)
                    return jsonify({"error": 1})

            elif postData['event'] == "get_elasped_time":
                task_id = postData['id']
                try:
                    res = cursor.execute(
                        f"SELECT elasped_seconds, total_seconds from tasks WHERE id = {task_id}"
                    ).fetchone()

                    print(
                        f"Fetched task {task_id}'s elasped seconds of {res['elasped_seconds']} and total time {res['total_seconds']}"
                        )

                    return jsonify({"elasped-time-seconds": res["elasped_seconds"], "total-time": res["total_seconds"]})

                except Exception as e:
                    print(e)
                    return jsonify({"error": 1})

            elif postData["event"] == "display":
                try:
                    cursor.execute("SELECT * from tasks")
                    r = [dict((cursor.description[i][0], value)
                              for i, value in enumerate(row)) for row in cursor.fetchall()]

                    return {record["id"]: record for record in r}

                except Exception as e:
                    print(e)
                    return jsonify({"error": 1})

        tasks = cursor.execute(
            "SELECT * FROM tasks WHERE user_id = ?", (session.get("user_id"),)).fetchall()

        db.close_db()
        return render_template("task/task.html", tasks=tasks, tab='home')

    return app


# For deployment
app = create_app()
