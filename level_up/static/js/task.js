
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
                <p id="elasped-time-${responseJson["task-id"]}" class="p-1">00:00:00</p>
                <div role="progressbar" class="mdc-linear-progress text-start mdc-linear-progress--animation-ready">
                    <div id="progressbar-${responseJson["task-id"]}"class="mdc-linear-progress__bar mdc-linear-progress__primary-bar" style="transform: scaleX(0.5)">
                        <span class="mdc-linear-progress__bar-inner"></span>
                    </div>
                    <div class="mdc-linear-progress__bar mdc-linear-progress__secondary-bar">
                        <span class="mdc-linear-progress__bar-inner"></span>
                    </div>
                </div>
                <p id="total-time-${responseJson["task-id"]}" class="p-1">00:00:00</p>
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
            responseJson['total-seconds']
        );

    })
    add_delete_funtionality_to_all_cards();

}

function convert_HMS_to_seconds(hours, minutes, seconds) {
    return (parseInt(hours) * 3600) + (parseInt(minutes) * 60) + parseInt(seconds);
}

function convert_seconds_to_HMS(input_seconds) {
    let hours = Math.floor(input_seconds / 3600);
    let minutes = Math.floor((input_seconds - (hours * 3600)) / 60);
    let seconds = input_seconds % 60;

    return [hours, minutes, seconds]
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
            'total-seconds': convert_HMS_to_seconds(taskTimeHours, taskTimeMinutes, taskTimeSeconds)
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
                'total-seconds': responseJson["total-seconds"]
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
                task["total_seconds"]
            );
        }
    })


}

// Parent function that add makes the timer work
function play_pause_display(id, totalTime) {
    const progressBar = document.getElementById(`progressbar-${id}`);
    const elasped_time_div = document.getElementById(`elasped-time-${id}`);
    const total_time_div = document.getElementById(`total-time-${id}`);
    const pause_btn = document.getElementById(`play-pause-${id}`);

    let interval_timer;
    let is_paused = false;
    let is_ticking = false;
    let elasped_seconds_interval = 0;

    let [hours, minutes, seconds] = convert_seconds_to_HMS(totalTime);

    // Display total time
    total_time_div.textContent = `${hours < 10 ? '0' : ''}${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

    function timer() {
        interval_timer = setInterval(function () {
            elasped_seconds_interval++;

            // Update elasped time
            let [elasped_hours, elasped_minutes, elasped_seconds] = convert_seconds_to_HMS(elasped_seconds_interval);
            let elaspedTime = `${elasped_hours < 10 ? '0' : ''}${elasped_hours}:${elasped_minutes < 10 ? '0' : ''}${elasped_minutes}:${elasped_seconds < 10 ? '0' : ''}${elasped_seconds}`;
            elasped_time_div.textContent = elaspedTime;

            // When timer completed
            if (elasped_seconds_interval >= totalTime) {
                clearInterval(interval_timer);
                is_ticking = false;

                // Change pause button to play button
                pause_btn.classList.remove('pause');
                pause_btn.classList.add('play');

                // Display task completed modal
                display_task_completed(totalTime);

                // Update user's experience
                postRequest('/task', { 'event': 'update', 'exp': totalTime });

                // TODO 
                return;
            }
        }, 1000);
    }
    function timer_controls() {

        // Timer is started
        if (is_ticking === false) {
            timer();
            is_ticking = true;
            this.classList.remove('play');
            this.classList.add('pause');

            // Timer is unpaused
        } else if (is_paused) {
            this.classList.remove('play');
            this.classList.add('pause');
            timer();
            is_paused = is_paused ? false : true

            // Timer is paused
        } else {
            this.classList.remove('pause');
            this.classList.add('play');
            clearInterval(interval_timer);
            is_paused = is_paused ? false : true;
        }
    }

    pause_btn.addEventListener('click', timer_controls);
}

// Displays a modal to the user showing their experience gained for task completion
function display_task_completed(totalTime) {
    let task_complete_modal = new bootstrap.Modal(document.getElementById('task-complete-modal'), {
        keyboard: false
    });

    document.getElementById("exp-gain").innerHTML = "+ " + totalTime + " XP";
    task_complete_modal.show();
    function close_modal() {
        let close_modal_backdrop = $(".modal-backdrop");
        close_modal_backdrop.remove();
    }

    close_modal_button = $("#close-modal")[0];
    close_modal_button.addEventListener('click', close_modal);

    let content_container = $(".content");
    let modal_backdrop = document.createElement("div");
    modal_backdrop.classList.add("modal-backdrop", "fade", "show");

    content_container.append(modal_backdrop);
}