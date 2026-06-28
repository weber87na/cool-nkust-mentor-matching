import {
  AgentEventsEnum,
  LiveAvatarSession,
  SessionEvent,
  SessionState,
} from "@heygen/liveavatar-web-sdk";

function resolveSessionToken(sessionResponse) {
  return (
    sessionResponse?.data?.session_token ||
    sessionResponse?.session_token ||
    sessionResponse?.token ||
    sessionResponse?.sessionToken ||
    ""
  );
}

function emit(root, name, detail) {
  root.dispatchEvent(new CustomEvent(name, { detail }));
}

window.LiveAvatarSDK = {
  async create({ root, session, voiceChat = true, ...clientOptions }) {
    const sessionToken = resolveSessionToken(session);
    if (!sessionToken) {
      throw new Error("LiveAvatar session token missing");
    }

    root.textContent = "";
    const video = document.createElement("video");
    video.autoplay = true;
    video.playsInline = true;
    video.muted = false;
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.objectFit = "cover";
    video.style.background = "#050202";
    root.append(video);

    const avatarSession = new LiveAvatarSession(sessionToken, {
      voiceChat,
      ...clientOptions,
    });

    avatarSession.on(SessionEvent.SESSION_STATE_CHANGED, (state) => {
      emit(root, "liveavatar-state", { state });
      if (state === SessionState.CONNECTED) {
        root.classList.add("is-liveavatar-connected");
      }
    });

    avatarSession.on(SessionEvent.SESSION_STREAM_READY, () => {
      avatarSession.attach(video);
      emit(root, "liveavatar-stream-ready", {});
    });

    avatarSession.on(SessionEvent.SESSION_DISCONNECTED, (event) => {
      emit(root, "liveavatar-disconnected", event);
    });

    avatarSession.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, (event) => {
      emit(root, "liveavatar-speak-started", event);
    });

    avatarSession.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, (event) => {
      emit(root, "liveavatar-speak-ended", event);
    });

    return {
      session: avatarSession,
      video,
      async start() {
        await avatarSession.start();
        avatarSession.attach(video);
      },
      async stop() {
        await avatarSession.stop();
      },
    };
  },
};
