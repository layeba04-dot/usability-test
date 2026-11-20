
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

timerTypeInput.addEventListener("change", function() {
    if (timerTypeInput.value === "stopwatch") {
        timerDurationInput.disabled = true;
        timerDurationInput.value = "";
    } else {
        timerDurationInput.disabled = false;
    }
});



function playCompleteSound() {
    const audioContext = new AudioContext();

    const oscillator = audioContext.createOscillator();
    const volume = audioContext.createGain();

    oscillator.connect(volume);
    volume.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    volume.gain.value = 0.2;

    oscillator.start();

    oscillator.stop(audioContext.currentTime + 0.5);

    return new Promise(function(resolve) {
        oscillator.onended = function() { //let's us know when beep finished playing
            audioContext.close();
            resolve();
        };
    });
}

function displayTracker(tracker) {

    const trackerCard = document.createElement("div");
    trackerCard.classList.add("tracker-card");

    const trackerTitle = document.createElement("h4");
    trackerTitle.textContent = tracker.name;


    const trackerType = document.createElement("p");
    trackerType.textContent = tracker.type === "stopwatch" ? "Stopwatch" : "Countdown Timer";

    const timerDisplay = document.createElement("h3");
    timerDisplay.classList.add("timer-display");
    if (tracker.type === "countdown") {
        const totalSeconds = tracker.duration * 60;

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        timerDisplay.textContent =
            String(hours).padStart(2, "0") + ":" +
            String(minutes).padStart(2, "0") + ":" +
            String(seconds).padStart(2, "0");
    } else {
        timerDisplay.textContent = "00:00:00";
    }

    const startButton = document.createElement("button");
    startButton.textContent = "Start";
    startButton.classList.add("timer-button");

    let timerInterval = null;
    let startTime = null;

    function completeCountdown() {
        const confirmed = confirm("Your study session is complete! Would you like to log this session?");

        if (confirmed) {
            const session = {
                duration: tracker.duration * 60,
                date: new Date()
            };

            tracker.sessions.push(session);
            displaySession(session, sessionList);
        }
    }

    startButton.addEventListener("click", function() {
        //can't start another interval when one's already running
        if (timerInterval !== null) {
            return;
        }
        
        startTime = Date.now();
        const startingDuration = tracker.duration * 60 * 1000; //converts minutes into milliseconds

        timerInterval = setInterval(function() {
            const currentTime = Date.now();
            const elapsedTime = currentTime - startTime;

            let totalSeconds;

            if (tracker.type === "stopwatch") {
                totalSeconds = Math.floor(elapsedTime / 1000);
            } else {
                const remainingTime = startingDuration - elapsedTime;
                if (remainingTime <= 0) {
                    clearInterval(timerInterval);
                    timerInterval = null;

                    totalSeconds = 0;

                    playCompleteSound().then(function() {
                        completeCountdown();
                    });

                } else {
                    totalSeconds = Math.ceil(remainingTime / 1000);
                }
            }

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

        if (tracker.type === "stopwatch") {
            timerDisplay.textContent = "00:00:00";
        } else {
            const totalSeconds = tracker.duration * 60;

            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            timerDisplay.textContent =
                String(hours).padStart(2, "0") + ":" +
                String(minutes).padStart(2, "0") + ":" +
                String(seconds).padStart(2, "0");
        }
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
        const hours = Math.floor(session.duration / 3600);
        const minutes = Math.floor((session.duration % 3600) / 60);
        const seconds = session.duration % 60;

        if (hours > 0) {
    sessionDuration.textContent = hours + (hours === 1 ? " hour" : " hours");

    if (minutes > 0) {
        sessionDuration.textContent += ", " + minutes + (minutes === 1 ? " minute" : " minutes");
    }
    } else if (minutes > 0) {
        sessionDuration.textContent = minutes + (minutes === 1 ? " minute" : " minutes");
    } else {
        sessionDuration.textContent = "Less than a minute";
    }

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




