import os
import json
from flask import Flask, request, render_template, g, session, jsonify


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
    def hello():
        return "Hello, World!"

    @app.route("/index")
    def index():
        return "Index Page!"

    @app.route("/profile")
    def profile():
        return render_template("profile.html", message="Username", alert="alert-success")

    @app.route("/timer")
    def timer():
        return render_template("/task/task_timer.html")

    # register the database commands
    import db

    db.init_app(app)

    # apply the blueprints to the app
    import auth

    app.register_blueprint(auth.bp)

    # make url_for('index') == url_for('blog.index')
    # in another app, you might define a separate main index here with
    # app.route, while giving the blog blueprint a url_prefix, but for
    # the tutorial the blog will be the main index
    app.add_url_rule("/", endpoint="")

    @app.route("/task", methods=["GET", "POST"])
    def task():
        if g.user == None:
            return "Please Login"

        # Initialize Variables
        taskName = None
        taskId = None

        connection = db.get_db()
        cursor = connection.cursor()

        if request.method == "POST" and not request.data == b"":
            postData = json.loads(request.data.decode('utf-8'))

            if postData["event"] == "delete":
                taskId = postData['id']
                cursor.execute(
                    f"DELETE FROM tasks WHERE id='{taskId}';",
                )
                connection.commit()
                print(f"Task id {taskId} has been deleted")

            if postData['event'] == "add":
                taskName = postData['task-name']
                taskTimeHours = postData['task-time-hours']
                taskTimeMinutes = postData['task-time-minutes']
                taskTimeSeconds = postData['task-time-seconds']
                try:
                    cursor.execute(
                        "INSERT INTO tasks (user_id, task_name, task_time_hours, task_time_minutes, task_time_seconds) VALUES (?, ?, ?, ?, ?)",
                        (session.get("user_id"), taskName, taskTimeHours, taskTimeMinutes, taskTimeSeconds),
                    )
                    connection.commit()

                    created_taskid = cursor.execute(
                        "SELECT MAX(id) from tasks",).fetchone()[0]
                    newTask = {
                        'task-id': created_taskid,
                        'task-name': taskName,
                        'task-time-hours': taskTimeHours,
                        'task-time-hours': taskTimeMinutes,
                        'task-time-hours': taskTimeSeconds,
                        'error': 0
                    }
                    
                    return jsonify(newTask)
                    
                except Exception as e:
                    print(e)
                    return jsonify({"error": 1})

            if postData["event"] == "display":
                try:
                    cursor.execute("SELECT * from tasks")
                    r = [dict((cursor.description[i][0], value)
                        for i, value in enumerate(row)) for row in cursor.fetchall()]

                    return {record["id"]:record for record in r}

                except Exception as e:
                                print(e)
                                return jsonify({"error": 1})

        tasks = cursor.execute(
            "SELECT * FROM tasks WHERE user_id = ?", (session.get("user_id"),)).fetchall()
        return render_template("task/task.html", tasks=tasks)

    return app
