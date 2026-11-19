
//variables to store form, tracker container, and each individual tracker by name
const trackerForm = document.getElementById("tracker-form"); 
const trackerContainer = document.getElementById("trackers-container");

//refer to HTML elements, not values
const trackerNameInput = document.getElementById("tracker-name");
const timerTypeInput = document.getElementById("timer-type");
const timerDurationInput = document.getElementById("timer-duration");

let trackers = []; //array to store all trackers

trackerForm.addEventListener("submit", function(event) {
    //prevent page refresh when submitting
    event.preventDefault();

    //make duration required when countdown selected
    if (timerTypeInput.value === "countdown" && timerDurationInput.value === "") {
        alert("Please enter a study duration.");
        return;
    }
    
    const tracker = {
        name: trackerNameInput.value, //tracker name
        type: timerTypeInput.value, //timer type
        duration: timerTypeInput.value === "countdown" ? Number(timerDurationInput.value) : null, //timer duration as number if countdown, null if stopwatch
        sessions: [] //empty array to store future study sessions
    };

    trackers.push(tracker); //adds made tracker to tracker array

    displayTracker(tracker);

    trackerForm.reset();
});

function displayTracker(tracker) {

    const trackerCard = document.createElement("div");
    trackerCard.classList.add("tracker-card");

    const trackerTitle = document.createElement("h4");
    trackerTitle.textContent = tracker.name;


    const trackerType = document.createElement("p");
    trackerType.textContent = tracker.type === "stopwatch" ? "Stopwatch" : "Countdown Timer";

    const timerDisplay = document.createElement("h3");
    timerDisplay.textContent = "00:00:00";
    timerDisplay.classList.add("timer-display");



    const startButton = document.createElement("button");
    startButton.textContent = "Start";
    startButton.classList.add("timer-button");

    let timerInterval = null;
    let startTime = null;

    startButton.addEventListener("click", function() {
        //can't start another interval when one's already running
        if (timerInterval !== null) {
            return;
        }
        
        startTime = Date.now();

        timerInterval = setInterval(function() {
            const currentTime = Date.now();
            const elapsedTime = currentTime - startTime;

            const totalSeconds = Math.floor(elapsedTime / 1000);

            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds%3600)/60);
            const seconds = totalSeconds % 60;
            timerDisplay.textContent = 
                                String(hours).padStart(2, "0") + ":" +
                                String(minutes).padStart(2, "0") + ":" +
                                String(seconds).padStart(2, "0");

        }, 1000);

        console.log("Starting: " + tracker.name);
    });

    const stopButton = document.createElement("button");
    stopButton.textContent = "Stop";
    stopButton.classList.add("timer-button");

    stopButton.addEventListener("click", function() {

        if (timerInterval === null) {
            return;
        }

        clearInterval(timerInterval);

        const elapsedTime = Date.now() - startTime;
        const totalSeconds = Math.floor(elapsedTime / 1000);
        
        const confirmed = confirm("would you like to log this study session?");
        
        if (confirmed) {
            const session = {
                duration: totalSeconds,
                date: new Date()
            };

            tracker.sessions.push(session);
            console.log(tracker.sessions);

            displaySession(session, sessionList);
        }

        timerInterval = null;
    });

    const sessionHistory = document.createElement("div");
    sessionHistory.classList.add("session-history");

    const sessionHeading = document.createElement("h4");
    sessionHeading.textContent = "Session History";

    const sessionList = document.createElement("ul");

    sessionHistory.appendChild(sessionHeading);
    sessionHistory.appendChild(sessionList);

    function displaySession(session, container) {
        const sessionEntry = document.createElement("li");
        sessionEntry.classList.add("session-entry");

        const sessionDuration = document.createElement("p");
        sessionDuration.textContent = session.duration + " seconds";

        const sessionDate = document.createElement("p");
        sessionDate.textContent = session.date.toLocaleDateString("en-GB", {day: "numeric", month: "long", year: "numeric"});

        sessionEntry.appendChild(sessionDuration);
        sessionEntry.appendChild(sessionDate);

        container.appendChild(sessionEntry);
    }

    
    trackerCard.appendChild(trackerTitle);
    trackerCard.appendChild(trackerType);
    trackerCard.appendChild(timerDisplay);
    trackerCard.appendChild(startButton);
    trackerCard.appendChild(stopButton);
    trackerCard.appendChild(sessionHistory);

    trackerContainer.appendChild(trackerCard);
}




