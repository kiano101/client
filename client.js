// eslint-disable-next-line no-undef
const socket = io();

socket.on("connect", () => {
  const storedUsername = localStorage.getItem("username");
  if (storedUsername) {
    socket.emit("set username", storedUsername);
  }
});

// load all the messages in the database
socket.on("chat history", (messages) => {
  messages.forEach((message) => {
    addMessageToChat(message.username, message.message, message.timestamp);
    console.log("chat history resotred");
  });
});

//load all the private messages
socket.on("private chat history", (messages) => {
  messages.forEach(({ sender, message, timestamp }) => {
    addPrivateMessageToChat(sender, message, timestamp);
  });
});

//handles incoming private messages
socket.on("recieve private message", ({ from, message, timestamp }) => {
  addPrivateMessageToChat(from, message, timestamp);
});

// handles the chats sent and recieved between the clients
socket.on("chat sent", (data) => {
  console.log("Received chat message from server: ", data);
  const { username, message, timestamp } = data;

  if (username && message) {
    addMessageToChat(username, message, timestamp);
  } else {
    console.error("Invalid chat message data:", data);
  }
});

function addMessageToChat(username, message, timestamp) {
  const messagesDiv = document.getElementById("messages-grp");
  const newMessageDiv = document.createElement("div");
  newMessageDiv.className = "message";

  // eslint-disable-next-line no-undef
  const formattedTimeStamp = moment(timestamp)
    .tz("Asia/Beirut")
    .format("DD-MM-YYYY HH:mm");

  newMessageDiv.innerHTML = `<span class="author">${username}: </span> ${message} <span class="timestamp">${formattedTimeStamp}</span>`;
  messagesDiv.appendChild(newMessageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// login button logic
document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    if (result.success) {
      localStorage.setItem("token", result.token);
      localStorage.setItem("username", result.username);
      showAlert("Login Successful", "success");
      socket.emit("set username");
      document.getElementById("login-container").style.display = "none";
      document.getElementById("home-container").style.display = "block";
    } else {
      showAlert(result.message, "danger");
    }
  } catch (error) {
    console.error("Error logging in:", error);
    showAlert("Login failed. Please try again.", "danger");
  }
});

// register button logic
document.getElementById("registerBtn").addEventListener("click", async () => {
  const username = document.getElementById("registerUsername").value;
  const email = document.getElementById("registerEmail").value;
  const password = document.getElementById("registerPassword").value;

  try {
    const response = await fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    const result = await response.json();
    if (result.success) {
      localStorage.setItem("token", result.token);
      showAlert("Registration Successful", "success");
      document.getElementById("register-container").style.display = "none";
      document.getElementById("chat-container").style.display = "block";
    } else {
      showAlert(result.message, "danger");
    }
  } catch (error) {
    console.error("Error registering:", error);
    showAlert("Registration failed. Please try again.", "danger");
  }
});

// logout button logic
document.getElementById("logOutBtn").addEventListener("click", () => {
  console.log("logout pressed");
  logout();
  showAlert("Logout Successful!", "success");
});

socket.on("update user list", (allUsers) => {
  const usersList = document.getElementById("allUsers");
  usersList.innerHTML = "";
  allUsers.forEach((username) => {
    const user = document.createElement("div");
    user.innerHTML = username;
    user.className = "user-item";
    user.addEventListener("click", () => {
      startPrivateChat(username);
    });
    usersList.appendChild(user);
  });
});

// register redirect button
document.getElementById("regBtn").addEventListener("click", () => {
  document.getElementById("login-container").style.display = "none";
  document.getElementById("register-container").style.display = "block";
});

// login button redirect
document.getElementById("logBtn").addEventListener("click", () => {
  document.getElementById("register-container").style.display = "none";
  document.getElementById("login-container").style.display = "block";
});

// back button logic from home
document.getElementById("backBtn-login").addEventListener("click", () => {
  document.getElementById("home-container").style.display = "none";
  document.getElementById("login-container").style.display = "block";
  document.getElementById("loginEmail").value = "";
  document.getElementById("loginPassword").value = "";
});

// back button logic from group chat
document.getElementById("backBtn-grp-home").addEventListener("click", () => {
  document.getElementById("chat-container").style.display = "none";
  document.getElementById("home-container").style.display = "block";
});

//back button logic from private chat to private home
document.getElementById("backBtn-prvt").addEventListener("click", () => {
  document.getElementById("private-chat-container").style.display = "none";
  document.getElementById("private-home-container").style.display = "block";
});

// back button logic from private home
document
  .getElementById("backBtn-home-private")
  .addEventListener("click", () => {
    document.getElementById("private-home-container").style.display = "none";
    document.getElementById("home-container").style.display = "block";
  });

// private chat redirect
document.getElementById("privateChatBtn").addEventListener("click", () => {
  document.getElementById("home-container").style.display = "none";
  document.getElementById("private-home-container").style.display = "block";
  socket.emit("request user list");
});

// group chat redirect
document.getElementById("groupChatBtn").addEventListener("click", () => {
  document.getElementById("home-container").style.display = "none";
  document.getElementById("chat-container").style.display = "block";
  const messagesDiv = document.getElementById("messages-grp");
  messagesDiv.scrollTo({ top: 100000, behavior: "smooth" });
});

// press enter to login logic
document
  .getElementById("loginPassword")
  .addEventListener("keydown", (event) => {
    const loginBtn = document.getElementById("loginBtn");
    if (event.key === "Enter") {
      event.preventDefault();
      loginBtn.click();
    }
  });

// press enter to register logic
document
  .getElementById("registerPassword")
  .addEventListener("keydown", (event) => {
    const registerBtn = document.getElementById("registerBtn");
    if (event.key === "Enter") {
      event.preventDefault();
      registerBtn.click();
    }
  });

// press enter to send message
document.getElementById("messageInput").addEventListener("keydown", (event) => {
  const sendBtn = document.getElementById("sendBtn");
  if (event.key === "Enter") {
    event.preventDefault();
    sendBtn.click();
  }
});

async function sendMessage() {
  const messageInput = document.getElementById("messageInput");
  const message = messageInput.value;
  const storedUsername = localStorage.getItem("username");
  if (storedUsername && message) {
    socket.emit("chat message", { username: storedUsername, message });
    messageInput.value = "";
  } else {
    console.error("Username is not set");
  }
}

function showAlert(message, type) {
  const duration = 1500;
  const alert = document.createElement("div");
  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.role = "alert";
  alert.innerHTML = `${message}
    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
      <span aria-hidden="true">&times;</span>
    </button>`;

  document.getElementById("alert-container").appendChild(alert);

  setTimeout(() => {
    // eslint-disable-next-line no-undef
    $(alert).alert("close");
  }, duration);
}

// function isTokenExpired(token) {
//   try {
//     // eslint-disable-next-line no-undef
//     const decoded = jwt_decode(token);
//     const currentTime = Date.now() / 1000;
//     return decoded.exp < currentTime;
//   } catch (error) {
//     console.error("Error decoding token: ", error);
//     return true;
//   }
// }

function logout() {
  localStorage.removeItem("token");
  document.getElementById("chat-container").style.display = "none";
  document.getElementById("private-chat-container").style.display = "none";
  document.getElementById("home-container").style.display = "none";
  document.getElementById("login-container").style.display = "block";
  document.getElementById("loginEmail").value = "";
  document.getElementById("loginPassword").value = "";
}

function startPrivateChat(recipientUsername) {
  const from = localStorage.getItem("username");

  document.getElementById("private-home-container").style.display = "none";
  document.getElementById("private-chat-container").style.display = "block";

  document.getElementById("privateChatRecipient").textContent =
    recipientUsername;

  socket.emit("get private messages", { from: from, rec: recipientUsername });

  const prvtSendBtn = document.getElementById("prvtSendBtn");

  prvtSendBtn.addEventListener("click", sendPrivateMessage);
}

document
  .getElementById("privateMessageInput")
  .addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendPrivateMessage();
    }
  });

function sendPrivateMessage() {
  const privateMessageInput = document.getElementById("privateMessageInput");
  const privateMessage = privateMessageInput.value;
  const recipientUsername = document.getElementById(
    "privateChatRecipient"
  ).textContent;
  const storedUsername = localStorage.getItem("username");
  const timestamp = new Date().toISOString();

  if (storedUsername && privateMessage && recipientUsername) {
    socket.emit("private message", {
      sender: storedUsername,
      recipient: recipientUsername,
      message: privateMessage,
    });

    addPrivateMessageToChat(storedUsername, privateMessage, timestamp);
    console.log("Private message sent");

    privateMessageInput.value = "";
  } else {
    console.error("Missing sender username, message, or recipient username.");
  }
}

function addPrivateMessageToChat(senderUsername, message, timestamp) {
  const privateMessagesDiv = document.getElementById("privateMessages");
  const newMessageDiv = document.createElement("div");
  newMessageDiv.className = "message";

  // eslint-disable-next-line no-undef
  const formattedTimeStamp = moment(timestamp)
    .tz("Asia/Beirut")
    .format("DD-MM-YYYY HH:mm");

  newMessageDiv.innerHTML = `<span class='author'>${senderUsername}: </span> ${message} <span class="timestamp">${formattedTimeStamp}</span>`;
  privateMessagesDiv.appendChild(newMessageDiv);
  console.log("Private message added");

  privateMessagesDiv.scrollTop = privateMessagesDiv.scrollHeight;
}

document.getElementById("sendBtn").addEventListener("click", sendMessage);
