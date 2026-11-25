(() => {
    "use strict";

    const course = document.getElementById("report-course");
    const summary = document.getElementById("completion-summary");
    const bar = document.getElementById("completion-bar");
    const upcoming = document.getElementById("upcoming-list");

    function readList(key) {
        try {
            const saved = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(saved) ? saved.filter(item => item && typeof item === "object") : [];
        } catch {
            return [];
        }
    }

    // Compare the same local calendar dates used by the Deadlines page.
    function dateKey(date) {
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${date.getFullYear()}-${month}-${day}`;
    }

    function renderReport() {
        const deadlines = readList("studiousDeadlines");
        const courses = [...new Set(deadlines.map(item => item.course).filter(Boolean))].sort();
        const selectedCourse = course.value;
        course.replaceChildren(new Option("All courses", ""));
        for (const name of courses) {
            course.add(new Option(name, name));
        }
        if (courses.includes(selectedCourse)) course.value = selectedCourse;

        const filtered = deadlines.filter(item => !course.value || item.course === course.value);
        const completed = filtered.filter(item => item.status === "Done").length;
        const percent = filtered.length ? Math.round(completed / filtered.length * 100) : 0;
        summary.textContent = filtered.length
            ? `${completed} of ${filtered.length} completed (${percent}%)`
            : "No deadlines to track yet.";
        bar.value = percent;

        const today = new Date();
        const end = new Date(today);
        end.setDate(end.getDate() + 7);
        const firstDay = dateKey(today);
        const lastDay = dateKey(end);
        const dueSoon = filtered
            .filter(item => item.status !== "Done" && typeof item.due === "string"
                && item.due >= firstDay && item.due <= lastDay)
            .sort((a, b) => a.due.localeCompare(b.due));

        upcoming.replaceChildren();
        for (const item of dueSoon) {
            const date = new Date(`${item.due}T00:00:00`).toLocaleDateString(undefined, {
                month: "short", day: "numeric"
            });
            const row = document.createElement("li");
            row.textContent = `${item.title} · ${item.course} · ${date}`;
            upcoming.append(row);
        }
        if (!dueSoon.length) {
            const row = document.createElement("li");
            row.textContent = "No upcoming deadlines in this view.";
            upcoming.append(row);
        }

        const sessions = readList("studiousStudySessions")
            .filter(session => Number.isFinite(session.duration) && session.duration >= 0);
        const seconds = sessions.reduce((total, session) => total + session.duration, 0);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor(seconds / 60) % 60;
        document.getElementById("study-total").textContent = seconds < 60
            ? `${seconds} sec`
            : `${hours} h ${minutes} min`;
        document.getElementById("session-count").textContent =
            `${sessions.length} logged ${sessions.length === 1 ? "session" : "sessions"} across all trackers`;
    }

    course.addEventListener("change", renderReport);
    window.addEventListener("pageshow", renderReport);
    window.addEventListener("storage", renderReport);
    renderReport();
})();
