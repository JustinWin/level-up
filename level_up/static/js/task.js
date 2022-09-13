// POST Function for deleting tasks
async function post_request(url, data) {
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
async function add_task_post(data) {
    r = await post_request("/task", data).then(responseJson => {

        // Convert total seconds to readable format
        let total_seconds = convert_seconds_to_HMS(responseJson["total-seconds"]);

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
                    <div id="progress-bar-${responseJson["task-id"]}"class="mdc-linear-progress__bar mdc-linear-progress__primary-bar" style="transform: scaleX(0.0)">
                        <span class="mdc-linear-progress__bar-inner"></span>
                    </div>
                    <div class="mdc-linear-progress__bar mdc-linear-progress__secondary-bar">
                        <span class="mdc-linear-progress__bar-inner"></span>
                    </div>
                </div>
                <p id="total-time-${responseJson["task-id"]}" class="p-1">${total_seconds}</p>
            </div>

            <div class="controlls">
                <button class="play-pause play" id="play-pause-${responseJson["task-id"]}"></button>
            </div>
        `
        // Append card to task container
        let task_list_container = document.getElementById("task-list-container");
        task_list_container.append(card);

        // Add pause functionality
        const pause_btn = document.getElementById(`play-pause-${responseJson["task-id"]}`);
        pause_btn.addEventListener('click', function () { timer_controls(responseJson['task-id'], responseJson['total-seconds']) });

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
    let total_seconds = `${hours < 10 ? '0' : ''}${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

    return total_seconds
}


// Adds delete functionality to cards
function add_delete_funtionality_to_all_cards() {
    $('.close').click(function () {
        let $target = $(this).parents(".card");
        $target.hide('slow', function () { $target.remove(); });
        let task_id = ($target[0].id.replace('task-id-', ''))
        post_request('/task', { 'event': 'delete', 'id': task_id });

        // Display undo button
        let snackbar_delete = document.getElementById("snackbar-delete");
        snackbar_delete.classList.remove("mdc-snackbar--closed");
        snackbar_delete.classList.add("mdc-snackbar--open", "show")
    })
}

// On page refresh display times
function display_time_on_refresh() {
    all_tasks = post_request('/task', { 'event': 'display' }).then(data => {
        // TODO make it so you cant start multiple timers at once.
        for (let [id, task] of Object.entries(data)) {

            // Add play pause functionality
            let pause_btn = document.getElementById(`play-pause-${id}`);
            pause_btn.addEventListener('click', function () { timer_controls(id, task['total_seconds']) });

            // Update total time
            let total_time_label = document.getElementById(`total-time-${id}`);
            total_time_label.textContent = convert_seconds_to_HMS(task['total_seconds'])

            // Update elasped time
            let elasped_time_label = document.getElementById(`elasped-time-${id}`);
            elasped_time_label.textContent = convert_seconds_to_HMS(task['elasped_seconds'])

            // Update progress bar
            let progress_bar = document.getElementById(`progress-bar-${id}`);
            progress_bar.style.transform = `scaleX(${1 / task['total_seconds'] * task['elasped_seconds']})`
        }
    })
}

// When timer is paused, save elasped seconds to database
function save_elasped_time(id, current_elasped_seconds) {
    post_request('/task', { 'event': 'save_elasped_time', 'id': id, 'elasped-seconds': current_elasped_seconds });
}

// Controls the play and pause of the timer
function timer_controls(id, total_time) {
    let pause_btn = document.getElementById(`play-pause-${id}`);
    function initialize_timer() {

        let progress_increment = 1 / total_time;

        interval_timer = setInterval(function () {

            let progress_bar = document.getElementById(`progress-bar-${id}`);
            let elasped_time_div = document.getElementById(`elasped-time-${id}`);

            // Update elasped time
            current_elasped_seconds++;
            let elaspedTime = convert_seconds_to_HMS(current_elasped_seconds);
            elasped_time_div.textContent = elaspedTime;

            // Update progress bar
            current_progress += progress_increment
            progress_bar.style.transform = `scaleX(${current_progress})`

            // When timer completed
            if (current_elasped_seconds >= total_time) {

                clearInterval(interval_timer);
                is_ticking = false

                // Reset progress
                current_elasped_seconds = 0;
                current_progress = 0;

                // Change pause button to play button
                pause_btn.classList.remove('pause');
                pause_btn.classList.add('play');

                // Display task completed modal
                display_task_completed(total_time);

                // Update user's experience
                post_request('/task', { 'event': 'update', 'exp': total_time });
            }
        }, 1000);

        return interval_timer;
    }

    // Timer is unpaused
    if (pause_btn.classList.contains("play") && !is_ticking) {
        console.log(is_ticking);
        pause_btn.classList.remove('play');
        pause_btn.classList.add('pause');
        current_interval = initialize_timer(id, total_time);
        is_ticking = true
    }
    // Timer is paused
    else if (pause_btn.classList.contains("pause")) {
        pause_btn.classList.remove('pause');
        pause_btn.classList.add('play');
        save_elasped_time(id, current_elasped_seconds);
        clearInterval(current_interval);
        is_ticking = false
    }
}

// Displays a modal to the user showing their experience gained for task completion
function display_task_completed(total_time) {
    // Initialize modal
    let task_complete_modal = new bootstrap.Modal(document.getElementById('task-complete-modal'), {
        keyboard: false
    });

    // Show modal
    document.getElementById("exp-gain").innerHTML = "+ " + total_time + " XP";
    task_complete_modal.show();

    // Activate close modal button
    close_modal_button = $("#close-modal")[0];
    close_modal_button.addEventListener('click', function () {
        let close_modal_backdrop = $(".modal-backdrop");
        close_modal_backdrop.remove();
    });

    // Dim background
    let content_container = $(".content");
    let modal_backdrop = document.createElement("div");
    modal_backdrop.classList.add("modal-backdrop", "fade", "show");

    content_container.append(modal_backdrop);
}

// Activates submit task button
document.getElementById("add-task-submit-button").addEventListener("click", function () {
    // Prevents refresh
    event.preventDefault();
    task_name = document.getElementById("task-name").value;
    task_time_hours = document.getElementById("task-time-hours").value;
    task_time_minutes = document.getElementById("task-time-minutes").value;
    task_time_seconds = document.getElementById("task-time-seconds").value;
    add_task_post(
        {
            'event': 'add',
            'task-name': task_name,
            'total-seconds': convert_HMS_to_seconds(task_time_hours, task_time_minutes, task_time_seconds)
        });
});

function initialize_snackbar() {
    // Activate dismiss on snackbar
    let snackbar_dismiss = document.getElementById("snackbar-dismiss")
    snackbar_dismiss.addEventListener("click", function () {
        let snackbar_delete = document.getElementById("snackbar-delete");
        snackbar_delete.classList.remove("mdc-snackbar--open", "show")
        snackbar_delete.classList.add('mdc-snackbar--close');
    });

    // Activate undo on snackbar
    let snackbar_undo = document.getElementById("snackbar-undo")
    snackbar_undo.addEventListener("click", (e) => {
        recently_deleted_task = (post_request('/task', { 'event': 'undo' }).then(responseJson => {
            add_task_post(
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
}

// TODO make it so only one interval can go at a time (other ones grayed out)
// TODO Make it so when you refresh, paused timer start at the the elasped start time.
let current_interval;
let current_elasped_seconds = 0;
let current_progress = 0;
let is_ticking = false;

add_delete_funtionality_to_all_cards();
initialize_snackbar();
display_time_on_refresh();
