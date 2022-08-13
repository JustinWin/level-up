import os
from flask import Flask, request, render_template, g, session

from flask import Flask

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

        connection = db.get_db()
        cursor = connection.cursor()

        if request.method == "POST":
            print("POST for task")
            #print(request.data)
            taskName = request.form['task-name']
            taskTime = request.form['task-time']
            error = None

            if not taskName:
                error = "Task name is required."
            elif not taskTime:
                error = "Task time is required."
            print("her")
            if error is None:
                try:
                    cursor.execute(
                        "INSERT INTO tasks (user_id, task_name, task_time_minutes) VALUES (?, ?, ?)",
                        (session.get("user_id"), taskName, taskTime),
                    )
                    cursor.commit()
                except Exception:
                    error = "Error"

            #print(error)

        tasks = cursor.execute("SELECT * FROM tasks WHERE user_id = ?", (session.get("user_id"),)).fetchall()
        for task in tasks:   
            print(task['user_id'], end=' ')
            print(task['task_name'], end='')
            print(task['task_time_minutes'])
        return render_template("task/task.html", tasks=tasks)

    return app