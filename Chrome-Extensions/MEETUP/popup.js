const STORAGE_KEY = "meetings";

const state = {
  meetings: [],
  editingId: null,
};

const refs = {
  createBtn: document.getElementById("createBtn"),
  formCard: document.getElementById("formCard"),
  formHeading: document.getElementById("formHeading"),
  meetingForm: document.getElementById("meetingForm"),
  cancelBtn: document.getElementById("cancelBtn"),
  meetingList: document.getElementById("meetingList"),
  emptyState: document.getElementById("emptyState"),
  title: document.getElementById("title"),
  url: document.getElementById("url"),
  date: document.getElementById("date"),
  time: document.getElementById("time"),
  note: document.getElementById("note"),
  titleError: document.getElementById("titleError"),
  urlError: document.getElementById("urlError"),
  dateError: document.getElementById("dateError"),
  timeError: document.getElementById("timeError"),
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  refs.createBtn.addEventListener("click", onCreateClick);
  refs.cancelBtn.addEventListener("click", closeForm);
  refs.meetingForm.addEventListener("submit", onSubmit);
  loadMeetings();
}

function onCreateClick() {
  state.editingId = null;
  refs.formHeading.textContent = "Create Meeting";
  refs.meetingForm.reset();
  clearErrors();
  openForm();
}

function openForm() {
  refs.formCard.classList.remove("hidden");
  refs.title.focus();
}

function closeForm() {
  refs.formCard.classList.add("hidden");
  refs.meetingForm.reset();
  clearErrors();
  state.editingId = null;
}

function onSubmit(event) {
  event.preventDefault();
  clearErrors();

  const payload = {
    title: refs.title.value.trim(),
    url: refs.url.value.trim(),
    date: refs.date.value,
    time: refs.time.value,
    note: refs.note.value.trim(),
  };

  const isValid = validate(payload);
  if (!isValid) return;

  if (state.editingId) {
    updateMeeting(state.editingId, payload);
  } else {
    addMeeting(payload);
  }
}

function validate(values) {
  let valid = true;

  if (!values.title) {
    refs.titleError.textContent = "Title is required.";
    valid = false;
  }

  if (!values.url) {
    refs.urlError.textContent = "Meeting URL is required.";
    valid = false;
  } else {
    try {
      const parsed = new URL(values.url);
      if (!/^https?:$/i.test(parsed.protocol)) {
        refs.urlError.textContent = "Please enter a valid HTTP/HTTPS URL.";
        valid = false;
      }
    } catch (_error) {
      refs.urlError.textContent = "Please enter a valid URL.";
      valid = false;
    }
  }

  if (!values.date) {
    refs.dateError.textContent = "Date is required.";
    valid = false;
  }

  if (!values.time) {
    refs.timeError.textContent = "Time is required.";
    valid = false;
  }

  return valid;
}

function clearErrors() {
  refs.titleError.textContent = "";
  refs.urlError.textContent = "";
  refs.dateError.textContent = "";
  refs.timeError.textContent = "";
}

function addMeeting(payload) {
  const meeting = {
    id: crypto.randomUUID(),
    ...payload,
    createdAt: Date.now(),
  };
  state.meetings.push(meeting);
  persistMeetings();
}

function updateMeeting(id, payload) {
  state.meetings = state.meetings.map((meeting) =>
    meeting.id === id ? { ...meeting, ...payload } : meeting
  );
  persistMeetings();
}

function deleteMeeting(id) {
  state.meetings = state.meetings.filter((meeting) => meeting.id !== id);
  persistMeetings();
}

function persistMeetings() {
  chrome.storage.local.set({ [STORAGE_KEY]: state.meetings }, () => {
    if (chrome.runtime.lastError) {
      console.error("Failed to save meetings:", chrome.runtime.lastError);
      return;
    }
    renderMeetings();
    closeForm();
  });
}

function loadMeetings() {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    if (chrome.runtime.lastError) {
      console.error("Failed to load meetings:", chrome.runtime.lastError);
      return;
    }
    state.meetings = Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];
    renderMeetings();
  });
}

function renderMeetings() {
  // Keep upcoming meetings first (closest to now), then older meetings.
  const sorted = sortMeetingsByUpcoming(state.meetings);

  refs.meetingList.innerHTML = "";
  refs.emptyState.classList.toggle("hidden", sorted.length > 0);

  sorted.forEach((meeting) => {
    const item = document.createElement("article");
    item.className = "meeting-item";

    const platform = getPlatformFromUrl(meeting.url);
    const note = meeting.note ? `<p class="meeting-note">${escapeHtml(meeting.note)}</p>` : "";

    item.innerHTML = `
      <div class="meeting-title-row">
        <img class="platform-icon" src="${platform.icon}" alt="${platform.name} icon" />
        <h3 class="meeting-title">${escapeHtml(meeting.title)}</h3>
      </div>
      <a class="meeting-link" href="${escapeAttribute(meeting.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(meeting.url)}</a>
      <p class="meeting-meta">Date: ${formatDate(meeting.date)}</p>
      <p class="meeting-meta">Time: ${formatTime(meeting.time)}</p>
      ${note}
      <div class="meeting-actions">
        <button class="btn btn-primary" data-action="open" data-id="${meeting.id}" type="button">Open</button>
        <button class="btn btn-secondary" data-action="edit" data-id="${meeting.id}" type="button">Edit</button>
        <button class="btn btn-danger" data-action="delete" data-id="${meeting.id}" type="button">Delete</button>
      </div>
    `;

    refs.meetingList.appendChild(item);
  });

  bindCardActions();
}

function bindCardActions() {
  refs.meetingList.querySelectorAll("button[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-id");
      const action = button.getAttribute("data-action");
      if (action === "open") {
        const meeting = state.meetings.find((entry) => entry.id === id);
        if (meeting) window.open(meeting.url, "_blank", "noopener,noreferrer");
      }
      if (action === "edit") {
        startEdit(id);
      }
      if (action === "delete") {
        deleteMeeting(id);
      }
    });
  });
}

function startEdit(id) {
  const meeting = state.meetings.find((entry) => entry.id === id);
  if (!meeting) return;

  state.editingId = id;
  refs.formHeading.textContent = "Edit Meeting";
  refs.title.value = meeting.title;
  refs.url.value = meeting.url;
  refs.date.value = meeting.date;
  refs.time.value = meeting.time;
  refs.note.value = meeting.note || "";
  clearErrors();
  openForm();
}

function getPlatformFromUrl(url) {
  const normalized = url.toLowerCase();
  if (normalized.includes("meet.google.com")) {
    return { name: "Google Meet", icon: "icons/google-meet.svg" };
  }
  if (normalized.includes("zoom.us")) {
    return { name: "Zoom", icon: "icons/zoom.svg" };
  }
  if (normalized.includes("teams.microsoft.com") || normalized.includes("teams.live.com")) {
    return { name: "Microsoft Teams", icon: "icons/teams.svg" };
  }
  return { name: "Meeting", icon: "icons/meeting.svg" };
}

function toDateTime(meeting) {
  return new Date(`${meeting.date}T${meeting.time}:00`);
}

function sortMeetingsByUpcoming(meetings) {
  const now = Date.now();

  return [...meetings].sort((a, b) => {
    const aTime = toDateTime(a).getTime();
    const bTime = toDateTime(b).getTime();
    const aUpcoming = aTime >= now;
    const bUpcoming = bTime >= now;

    if (aUpcoming && !bUpcoming) return -1;
    if (!aUpcoming && bUpcoming) return 1;
    return aTime - bTime;
  });
}

function formatDate(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatTime(timeValue) {
  const date = new Date(`1970-01-01T${timeValue}:00`);
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return String(value).replace(/\"/g, "&quot;");
}