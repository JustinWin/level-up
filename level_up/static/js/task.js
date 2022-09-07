
add_delete_funtionality_to_all_cards();
display_time_on_refresh();
// POST Function for deleting tasks
async function postRequest(url, data) {
    const response = await fetch(url, {
        method: 'POST', // or 'PUT'
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    });
    let responseJson = await response.json(); // parses JSON response into native JavaScript objects

    return responseJson
}
// Generic POST function for adding tasks
async function addTaskPost(url, data) {
    r = await postRequest('/task', data).then(responseJson => {

        // Create card element
        let card = document.createElement("div")
        card.id = "task-id-" + responseJson["task-id"]
        card.classList.add("m-3", "w-100", "card", "card-body", "text-bg-dark", "justify-content-center", "d-inline-block");
        card.style.height = "160px";
        card.innerHTML = `
            <a class="close float-end" href="#"><i class="material-icons mdc-button__icon">delete</i></a>
            <h5 class="card-header text-center">${responseJson["task-name"]}</h5>
            <div class="d-flex justify-content-center align-items-center">
                <p class="p-1">00:00:00</p>
                <div role="progressbar" class="mdc-linear-progress text-start mdc-linear-progress--animation-ready">
                    <div class="mdc-linear-progress__bar mdc-linear-progress__primary-bar" style="transform: scaleX(0.5)">
                        <span class="mdc-linear-progress__bar-inner"></span>
                    </div>
                    <div class="mdc-linear-progress__bar mdc-linear-progress__secondary-bar">
                        <span class="mdc-linear-progress__bar-inner"></span>
                    </div>
                </div>
                <p class="p-1">00:00:00</p>
            </div>

            <div class="controlls">
                <div id="remaining-time-${responseJson["task-id"]}" class="display-remain-time"></div>
                <button class="play-pause play" id="play-pause-${responseJson["task-id"]}"></button>
            </div>
        `
        // Append card to task container
        let taskListContainer = document.getElementById("task-list-container");
        taskListContainer.append(card);
        play_pause_display(
            responseJson['task-id'],
            responseJson['task-time-hours'],
            responseJson['task-time-minutes'],
            responseJson['task-time-seconds']
        );

    })
    add_delete_funtionality_to_all_cards();

}

document.getElementById("add-task-submit-button").addEventListener("click", function () {
    // Prevents refresh
    event.preventDefault();
    taskName = document.getElementById("task-name").value;
    taskTimeHours = document.getElementById("task-time-hours").value;
    taskTimeMinutes = document.getElementById("task-time-minutes").value;
    taskTimeSeconds = document.getElementById("task-time-seconds").value;
    addTaskPost(
        '/task',
        {
            'event': 'add',
            'task-name': taskName,
            'task-time-hours': taskTimeHours,
            'task-time-minutes': taskTimeMinutes,
            'task-time-seconds': taskTimeSeconds
        });
});



let snackbar_dismiss = document.getElementById("snackbar-dismiss")
snackbar_dismiss.addEventListener("click", function () {
    let snackbar_delete = document.getElementById("snackbar-delete");
    snackbar_delete.classList.remove("mdc-snackbar--open", "show")
    snackbar_delete.classList.add('mdc-snackbar--close');
});

let snackbar_undo = document.getElementById("snackbar-undo")
snackbar_undo.addEventListener("click", (e) => {
    recently_deleted_task = (postRequest('/task', { 'event': 'undo' }).then(responseJson => {
        addTaskPost(
            '/task',
            {
                'event': 'add',
                'task-name': responseJson["task-name"],
                'task-time-hours': responseJson["task-time-hours"],
                'task-time-minutes': responseJson["task-time-minutes"],
                'task-time-seconds': responseJson["task-time-seconds"]
            }
        );
    }));
    let snackbar_delete = document.getElementById("snackbar-delete");
    snackbar_delete.classList.remove("mdc-snackbar--open", "show")
    snackbar_delete.classList.add('mdc-snackbar--close');

});



// Adds delete functionality to cards
function add_delete_funtionality_to_all_cards() {
    $('.close').click(function () {
        var $target = $(this).parents(".card");
        $target.hide('slow', function () { $target.remove(); });
        var task_id = ($target[0].id.replace('task-id-', ''))
        postRequest('/task', { 'event': 'delete', 'id': task_id });

        // Display undo button
        let snackbar_delete = document.getElementById("snackbar-delete");
        snackbar_delete.classList.remove("mdc-snackbar--closed");
        snackbar_delete.classList.add("mdc-snackbar--open", "show")
    })
}

// On page refresh display times
function display_time_on_refresh() {
    all_tasks = postRequest('/task', { 'event': 'display' }).then(data => {
        all_tasks_ids = Object.keys(data);
        for (let i = 0; i < all_tasks_ids.length; i++) {
            task = (data[all_tasks_ids[i]]);
            play_pause_display(
                task["id"],
                task["task_time_hours"],
                task["task_time_minutes"],
                task["task_time_seconds"]
            );
        }
    })


}

// Parent function that add makes the timer work
function play_pause_display(id, input_hours, input_minutes, input_seconds) {
    let progressBar = document.getElementById(`progress-${id}`);
    let pointer = document.getElementById(`e-pointer-${id}`);
    let length = Math.PI * 2 * 100;
    progressBar.style.strokeDasharray = length;

    function update(value, timePercent) {
        var offset = - length - length * value / (timePercent);
        progressBar.style.strokeDashoffset = offset;
        pointer.style.transform = `rotate(${360 * value / (timePercent)}deg)`;
    };

    //circle ends
    const displayOutput = document.getElementById(`remaining-time-${id}`)
    const pauseBtn = document.getElementById(`play-pause-${id}`);
    const setterBtns = document.querySelectorAll('button[data-setter]');
    let intervalTimer;
    let timeLeft;
    let wholeTime = (parseInt(input_hours) * 3600) + (parseInt(input_minutes) * 60) + parseInt(input_seconds); // manage this to set the whole time in seconds
    let isPaused = false;
    let isStarted = false;
    update(wholeTime, wholeTime); //refreshes progress bar
    displayTimeLeft(wholeTime);

    function changeWholeTime(seconds) {
        if ((wholeTime + seconds) > 0) {
            wholeTime += seconds;
            update(wholeTime, wholeTime);
        }
    }

    function timer(seconds) { //counts time, takes seconds
        let remainTime = Date.now() + (seconds * 1000);
        displayTimeLeft(seconds);

        intervalTimer = setInterval(function () {
            timeLeft = Math.round((remainTime - Date.now()) / 1000);
            if (timeLeft < 0) {
                clearInterval(intervalTimer);
                isStarted = false;
                setterBtns.forEach(function (btn) {
                    btn.disabled = false;
                    btn.style.opacity = 1;
                });
                displayTimeLeft(wholeTime);
                pauseBtn.classList.remove('pause');
                pauseBtn.classList.add('play');

                // When timer hits zero, display task completed modal
                var task_complete_modal = new bootstrap.Modal(document.getElementById('task-complete-modal'), {
                    keyboard: false
                })

                document.getElementById("exp-gain").innerHTML = "+ " + wholeTime + " XP"
                task_complete_modal.show();
                function close_modal() {
                    let close_modal_backdrop = $(".modal-backdrop")
                    close_modal_backdrop.remove();
                }

                close_modal_button = $("#close-modal")[0];
                close_modal_button.addEventListener('click', close_modal);

                let content_container = $(".content");
                let modal_backdrop = document.createElement("div");
                modal_backdrop.classList.add("modal-backdrop", "fade", "show");

                content_container.append(modal_backdrop);

                postRequest('/task', { 'event': 'update', 'exp': wholeTime });

                return;
            }
            displayTimeLeft(timeLeft);
        }, 1000);
    }
    function pauseTimer(event) {
        if (isStarted === false) {
            timer(wholeTime);
            isStarted = true;
            this.classList.remove('play');
            this.classList.add('pause');

            setterBtns.forEach(function (btn) {
                btn.disabled = true;
                btn.style.opacity = 0.5;
            });

        } else if (isPaused) {
            this.classList.remove('play');
            this.classList.add('pause');
            timer(timeLeft);
            isPaused = isPaused ? false : true
        } else {
            this.classList.remove('pause');
            this.classList.add('play');
            clearInterval(intervalTimer);
            isPaused = isPaused ? false : true;
        }
    }

    function displayTimeLeft(timeLeft) { //displays time on the input
        let hours = Math.floor(timeLeft / 3600);
        let minutes = Math.floor((timeLeft - (hours * 3600)) / 60);
        let seconds = timeLeft % 60;
        let displayString = `${hours < 10 ? '0' : ''}${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        displayOutput.textContent = displayString;
        update(timeLeft, wholeTime);
    }

    pauseBtn.addEventListener('click', pauseTimer);
}
