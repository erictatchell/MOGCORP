import { initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import {
  collectionGroup,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from  "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  listAll,
  ref as storageRef,
  uploadBytesResumable,
} from "firebase/storage";
import { STRINGS, padCount } from "./strings.js";

const DAY_FOLDERS = ["thu", "fri", "sat", "sun", "mon"];
const DEFAULT_TRIPS = [
  {
    id: "mtl-25",
    label: "MONTREAL 25",
    slug: "mtl-25",
    sortOrder: 0,
    folders: ["root", "thu", "fri", "sat", "sun", "mon", "movie"],
  },
  {
    id: "vic-24",
    label: "VICTORIA 24",
    slug: "vic-24",
    sortOrder: 1,
    folders: ["root"],
  },
];
const ROOT_FOLDER_ID = "root";
const ROOT_FOLDER_SORT = -1;

const siteShell = document.getElementById("site-shell");
const vaultGate = document.getElementById("vault-gate");
const vaultFrameCanvas = document.getElementById("vault-frame");
const vaultVideo = document.getElementById("vault-video");
const vaultForm = document.getElementById("vault-form");
const vaultPasswordInput = document.getElementById("vault-password-input");
const vaultSubmitButton = document.getElementById("vault-submit-button");
const vaultStatusText = document.getElementById("vault-status");
const loadingText = document.getElementById("loading-text");
const logo = document.getElementById("logo");
const tripList = document.getElementById("trip-list");
const tripCount = document.getElementById("trip-count");
const authStatus = document.getElementById("auth-status");
const authDetail = document.getElementById("auth-detail");
const authWarning = document.getElementById("auth-warning");
const signOutButton = document.getElementById("sign-out-button");
const googleButton = document.getElementById("google-signin-button");
const adminPanel = document.getElementById("admin-panel");
const adminPanelsControl = document.getElementById("admin-panels-control");
const adminPanelsToggle = document.getElementById("admin-panels-toggle");
const adminPanelsToggleText = document.getElementById("admin-panels-toggle-text");
const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
const mobileMenuToggleLabel = document.getElementById("mobile-menu-toggle-label");
const mobileMenuPanel = document.getElementById("mobile-menu-panel");
const mobileMenuBackdrop = document.getElementById("mobile-menu-backdrop");
const mobileAdminPanelSlot = document.getElementById("mobile-admin-panel-slot");
const desktopControlPanelSlot = document.getElementById("desktop-control-panel-slot");
const friendsMobilePanel = document.getElementById("friends-mobile-panel");
const authAccessLabel = document.getElementById("auth-access-label");
const controlPanelTitle = document.getElementById("control-panel-title");
const tripDbTitle = document.getElementById("trip-db-title");
const uploadQueueTitle = document.getElementById("upload-queue-title");
const uploadStatusList = document.getElementById("upload-status-list");
const friendsDesktopCount = document.getElementById("friends-desktop-count");
const friendsMobileCount = document.getElementById("friends-mobile-count");
const friendsDesktopStatus = document.getElementById("friends-desktop-status");
const friendsMobileStatus = document.getElementById("friends-mobile-status");
const friendsDesktopList = document.getElementById("friends-desktop-list");
const friendsMobileList = document.getElementById("friends-mobile-list");
const friendsDesktopTitle = document.getElementById("friends-desktop-title");
const friendsMobileTitle = document.getElementById("friends-mobile-title");

const tripForm = document.getElementById("trip-form");
const folderForm = document.getElementById("folder-form");
const uploadForm = document.getElementById("upload-form");
const textPostForm = document.getElementById("text-post-form");

const folderTripSelect = document.getElementById("folder-trip-select");
const uploadTripSelect = document.getElementById("upload-trip-select");
const uploadFolderSelect = document.getElementById("upload-folder-select");
const textTripSelect = document.getElementById("text-trip-select");
const textFolderSelect = document.getElementById("text-folder-select");
const uploadFilesInput = document.getElementById("upload-files-input");
const uploadDescriptionInput = document.getElementById("upload-description-input");
const uploadDescriptionLabel = document.getElementById("upload-description-label");
const textTitleInput = document.getElementById("text-title-input");
const textBodyInput = document.getElementById("text-body-input");
const textPostFormTitle = document.getElementById("text-post-form-title");
const textPostSubmitButton = document.getElementById("text-post-submit-button");
const editPostModal = document.getElementById("edit-post-modal");
const editPostBackdrop = document.getElementById("edit-post-backdrop");
const editPostForm = document.getElementById("edit-post-form");
const editPostFormTitle = document.getElementById("edit-post-form-title");
const editPostContext = document.getElementById("edit-post-context");
const editPostTitleInput = document.getElementById("edit-post-title-input");
const editPostBodyInput = document.getElementById("edit-post-body-input");
const editPostCloseButton = document.getElementById("edit-post-close-button");
const editPostCancelButton = document.getElementById("edit-post-cancel-button");
const editPostSaveButton = document.getElementById("edit-post-save-button");
const videoPreviewModal = document.getElementById("video-preview-modal");
const videoPreviewBackdrop = document.getElementById("video-preview-backdrop");
const videoPreviewCloseButton = document.getElementById("video-preview-close-button");
const videoPreviewTitle = document.getElementById("video-preview-title");
const videoPreviewPlayer = document.getElementById("video-preview-player");
const videoPreviewPrevButton = document.getElementById("video-preview-prev-button");
const videoPreviewNextButton = document.getElementById("video-preview-next-button");
const ROLE_FRIEND = "friend";
const ROLE_ADMIN = "admin";
const ROLE_OWNER = "owner";
const MAX_VIDEO_UPLOADS_PER_DAY = 10;
const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024;
const ITEM_SORT_MEDIA_DATE_DESC = "media-date-desc";
const ITEM_SORT_MEDIA_DATE_ASC = "media-date-asc";
const ITEM_SORT_RECENTLY_ADDED = "recently-added";

let runtimeConfig = null;
let firebaseApp = null;
let auth = null;
let db = null;
let storage = null;
let currentUser = null;
let currentUserProfile = null;
let firestoreReady = false;
let storageReady = false;
let trips = [];
let expandedTrips = new Map();
let foldersByTrip = new Map();
let itemsByFolder = new Map();
let selectedFolders = new Map();
let itemSortPreferences = new Map();
let uploadJobs = [];
let firestoreAccessIssue = false;
let friendAccessIssue = false;
let friends = [];
let hasSeenPersistedTrips = false;
let needsDefaultTripSeed = false;
let currentTextPostEdit = null;
let adminPanelsVisible = false;
let mobileMenuOpen = false;
let editPostModalOpen = false;
let videoPreviewModalOpen = false;
let currentVideoPreviewContext = null;
let vaultState = {
  configured: false,
  unlocked: false,
  videoPath: "/assets/vault-intro.mp4",
};
let appInitializationPromise = null;
let vaultIntroPlaying = false;
let tripUnsubscribe = null;
let usersUnsubscribe = null;
const folderUnsubscribers = new Map();

applyStaticStrings();
startLoadingAnimation();
startLogoPulse();
renderAll();
setupForms();
initializeVaultExperience().catch((error) => {
  const message = error instanceof Error ? error.message : STRINGS.errors.initFailed;
  showWarning(message);
  setVaultStatusMessage(message.toUpperCase(), true);
});

function applyStaticStrings() {
  if (authAccessLabel) {
    authAccessLabel.textContent = STRINGS.auth.access;
  }

  if (googleButton) {
    googleButton.textContent = STRINGS.auth.signInButton;
  }

  if (signOutButton) {
    signOutButton.textContent = STRINGS.auth.signOutButton;
  }

  if (adminPanelsToggleText) {
    adminPanelsToggleText.textContent = STRINGS.auth.showAdminPanels;
  }

  if (mobileMenuToggle) {
    mobileMenuToggle.setAttribute("title", STRINGS.auth.openMenu);
    mobileMenuToggle.setAttribute("aria-label", STRINGS.auth.openMenu);
  }

  if (mobileMenuToggleLabel) {
    mobileMenuToggleLabel.textContent = STRINGS.auth.openMenu;
  }

  if (friendsDesktopTitle) {
    friendsDesktopTitle.textContent = STRINGS.members.panelTitle;
  }

  if (friendsMobileTitle) {
    friendsMobileTitle.textContent = STRINGS.members.panelTitle;
  }

  if (controlPanelTitle) {
    controlPanelTitle.textContent = STRINGS.admin.title;
  }

  if (uploadQueueTitle) {
    uploadQueueTitle.textContent = STRINGS.uploads.queueTitle;
  }

  if (tripDbTitle) {
    tripDbTitle.textContent = STRINGS.trips.listTitle;
  }

  if (uploadDescriptionLabel) {
    uploadDescriptionLabel.textContent = STRINGS.uploads.descriptionLabel;
  }

  if (uploadDescriptionInput) {
    uploadDescriptionInput.placeholder = STRINGS.uploads.descriptionPlaceholder;
  }

  if (textPostSubmitButton) {
    textPostSubmitButton.textContent = STRINGS.admin.addTextPost;
  }

  if (editPostFormTitle) {
    editPostFormTitle.textContent = STRINGS.admin.editTextPostTitle;
  }

  if (editPostCloseButton) {
    editPostCloseButton.textContent = STRINGS.admin.cancelEdit;
  }

  if (editPostCancelButton) {
    editPostCancelButton.textContent = STRINGS.admin.cancelEdit;
  }

  if (editPostSaveButton) {
    editPostSaveButton.textContent = STRINGS.admin.saveTextPost;
  }
}

async function initializeVaultExperience() {
  vaultState = await loadVaultStatus();
  applyVaultVideoSource(vaultState.videoPath);
  prepareVaultBackdrop();

  if (!vaultState.configured) {
    lockSiteShell();
    showVaultGate();
    setVaultFormEnabled(false);
    setVaultFormVisible(true);
    setVaultStatusMessage("SET VAULT_PASSWORD IN .ENV.", true);
    return;
  }

  if (vaultState.unlocked) {
    showVaultGate();
    setVaultFormVisible(false);
    setVaultStatusMessage("");
    const [initResult] = await Promise.allSettled([initializeAppOnce()]);
    if (initResult.status === "rejected") {
      showWarning(getErrorMessage(initResult.reason, "Initialization failed."));
    }
    revealSiteShell();
    hideVaultGate();
    return;
  }

  lockSiteShell();
  showVaultGate();
  setVaultFormEnabled(true);
  setVaultFormVisible(true);
  setVaultStatusMessage("");
  vaultPasswordInput?.focus();
}

async function initializeAppOnce() {
  if (appInitializationPromise) {
    return appInitializationPromise;
  }

  appInitializationPromise = initialize().catch((error) => {
    appInitializationPromise = null;
    throw error;
  });

  return appInitializationPromise;
}

async function initialize() {
  runtimeConfig = await loadRuntimeConfig();
  firestoreReady = initializeFirebaseIfPossible(runtimeConfig.firebaseConfig);
  storageReady = Boolean(
    runtimeConfig?.firebaseConfig?.storageBucket && firebaseApp
  );

  if (storageReady) {
    storage = getStorage(firebaseApp);
  }

  initializeAuthListener();
  initializeGoogleButton();
  initializeTripBrowserEvents();

  if (firestoreReady) {
    subscribeToTrips();
  } else {
    showWarning(STRINGS.errors.runtimeConfigMissing);
  }

  renderAll();
}

async function loadRuntimeConfig() {
  const response = await fetch("/api/config", {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("Could not load runtime configuration from /api/config.");
  }

  return response.json();
}

async function loadVaultStatus() {
  const response = await fetch("/api/vault/status", {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("Could not load vault status.");
  }

  const status = await response.json();
  return {
    configured: Boolean(status?.configured),
    unlocked: Boolean(status?.unlocked),
    videoPath: String(status?.videoPath || "/assets/vault-intro.mp4"),
  };
}

function applyVaultVideoSource(videoPath) {
  if (!vaultVideo) {
    return;
  }

  const sourceElement = vaultVideo.querySelector("source");

  if (sourceElement && sourceElement.getAttribute("src") !== videoPath) {
    sourceElement.setAttribute("src", videoPath);
  }

  if (vaultVideo.getAttribute("src") !== videoPath) {
    vaultVideo.setAttribute("src", videoPath);
  }

  vaultVideo.load();
}

function prepareVaultBackdrop() {
  if (!vaultVideo || !vaultFrameCanvas || vaultVideo.dataset.backdropReady === "true") {
    return;
  }

  vaultVideo.dataset.backdropReady = "true";
  const redraw = () => {
    if (!vaultIntroPlaying) {
      drawVaultFrame();
    }
  };

  vaultVideo.addEventListener("loadeddata", redraw);
  vaultVideo.addEventListener("seeked", redraw);
  window.addEventListener("resize", redraw);

  if (vaultVideo.readyState >= 2) {
    drawVaultFrame();
  }
}

function drawVaultFrame() {
  if (!vaultFrameCanvas || !vaultVideo || vaultVideo.readyState < 2) {
    return;
  }

  const context = vaultFrameCanvas.getContext("2d");

  if (!context) {
    return;
  }

  const width = Math.max(window.innerWidth, 1);
  const height = Math.max(window.innerHeight, 1);

  vaultFrameCanvas.width = width;
  vaultFrameCanvas.height = height;
  context.clearRect(0, 0, width, height);
  drawMediaCover(context, vaultVideo, width, height);
}

function drawMediaCover(context, media, width, height) {
  const sourceWidth = media.videoWidth || width;
  const sourceHeight = media.videoHeight || height;

  if (!sourceWidth || !sourceHeight) {
    return;
  }

  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = width / height;
  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;
  let cropX = 0;
  let cropY = 0;

  if (sourceRatio > targetRatio) {
    cropWidth = sourceHeight * targetRatio;
    cropX = (sourceWidth - cropWidth) / 2;
  } else {
    cropHeight = sourceWidth / targetRatio;
    cropY = (sourceHeight - cropHeight) / 2;
  }

  context.drawImage(
    media,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    width,
    height
  );
}

function lockSiteShell() {
  siteShell?.classList.add("pointer-events-none", "opacity-0");
  siteShell?.setAttribute("aria-hidden", "true");
  document.body.classList.add("overflow-hidden");
}

function revealSiteShell() {
  siteShell?.classList.remove("pointer-events-none", "opacity-0");
  siteShell?.setAttribute("aria-hidden", "false");
  document.body.classList.remove("overflow-hidden");
}

function showVaultGate() {
  vaultGate?.classList.remove("hidden", "pointer-events-none", "opacity-0");
  vaultGate?.classList.add("opacity-100");
  document.body.classList.add("overflow-hidden");
}

function hideVaultGate() {
  if (!vaultGate) {
    return;
  }

  vaultGate.classList.add("pointer-events-none", "opacity-0");
  vaultGate.classList.remove("opacity-100");
  window.setTimeout(() => {
    vaultGate.classList.add("hidden");
  }, 700);
}

function setVaultFormEnabled(enabled) {
  vaultPasswordInput?.toggleAttribute("disabled", !enabled);
  vaultSubmitButton?.toggleAttribute("disabled", !enabled);
}

function setVaultFormVisible(visible) {
  vaultForm?.classList.toggle("opacity-0", !visible);
  vaultForm?.classList.toggle("pointer-events-none", !visible);
}

function setVaultStatusMessage(message, isError = false) {
  if (!vaultStatusText) {
    return;
  }

  vaultStatusText.textContent = message;
  vaultStatusText.classList.toggle("hidden", !message);
  vaultStatusText.classList.toggle("text-red-100/85", isError);
  vaultStatusText.classList.toggle("text-stone-200/72", !isError);
}

async function handleVaultSubmit(event) {
  event.preventDefault();

  if (!vaultState.configured) {
    setVaultStatusMessage("SET VAULT_PASSWORD IN .ENV.", true);
    return;
  }

  const password = String(vaultPasswordInput?.value || "").trim();

  if (!password) {
    setVaultStatusMessage("ENTER PASSWORD.", true);
    vaultPasswordInput?.focus();
    return;
  }

  setVaultFormEnabled(false);
  setVaultFormVisible(true);
  setVaultStatusMessage("VERIFYING PASSWORD.");

  try {
    const response = await fetch("/api/vault/verify", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });
    const payload = await readJsonSafely(response);

    if (!response.ok) {
      setVaultStatusMessage(getFriendlyVaultMessage(payload), true);
      vaultPasswordInput?.select();
      return;
    }

    vaultState = { ...vaultState, unlocked: true };
    setVaultStatusMessage("ACCESS GRANTED.");
    setVaultFormVisible(false);

    const [initializeResult] = await Promise.allSettled([
      initializeAppOnce(),
      playVaultIntro(),
    ]);

    if (initializeResult.status === "rejected") {
      showWarning(getErrorMessage(initializeResult.reason, "Initialization failed."));
    }

    if (vaultPasswordInput) {
      vaultPasswordInput.value = "";
    }

    revealSiteShell();
    hideVaultGate();
    renderAll();
  } catch (error) {
    setVaultFormVisible(true);
    setVaultStatusMessage(
      getErrorMessage(error, "Vault unlock failed.").toUpperCase(),
      true
    );
  } finally {
    if (!vaultState.unlocked) {
      setVaultFormEnabled(true);
      setVaultFormVisible(true);
    }
  }
}

async function playVaultIntro() {
  if (!vaultVideo) {
    return;
  }

  vaultIntroPlaying = true;
  vaultVideo.classList.remove("opacity-0");
  vaultVideo.classList.add("opacity-100");

  try {
    vaultVideo.pause();
    vaultVideo.currentTime = 0;
  } catch {
    // Ignore currentTime reset failures and continue with playback.
  }

  try {
    await vaultVideo.play();
  } catch {
    vaultIntroPlaying = false;
    return;
  }

  await new Promise((resolve) => {
    const finish = () => {
      vaultVideo.removeEventListener("ended", finish);
      vaultVideo.removeEventListener("error", finish);
      resolve();
    };

    vaultVideo.addEventListener("ended", finish, { once: true });
    vaultVideo.addEventListener("error", finish, { once: true });
  });

  vaultIntroPlaying = false;
}

async function readJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function getFriendlyVaultMessage(payload) {
  const errorCode = String(payload?.error || "").toLowerCase();

  if (errorCode === "invalid_password") {
    return "INCORRECT PASSWORD.";
  }

  if (errorCode === "vault_not_configured") {
    return "SET VAULT_PASSWORD IN .ENV.";
  }

  return String(payload?.message || "VAULT ACCESS FAILED.").toUpperCase();
}

function initializeFirebaseIfPossible(firebaseConfig) {
  if (!hasFirebaseConfig(firebaseConfig)) {
    return false;
  }

  firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
  return true;
}

function initializeAuthListener() {
  if (!auth) {
    return;
  }

  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    currentUserProfile = null;

    if (user) {
      try {
        currentUserProfile = await syncUserRecord(user);
        await syncDefaultTripsIfNeeded();
        subscribeToFriends();
      } catch (error) {
        showWarning(getErrorMessage(error, STRINGS.errors.userSyncFailed));
      }
    } else {
      usersUnsubscribe?.();
      usersUnsubscribe = null;
      friendAccessIssue = false;
      friends = [];
      resetTextPostEditor();
      adminPanelsVisible = false;
      setMobileMenuOpen(false);
    }

    renderAll();
  });
}

function initializeGoogleButton() {
  if (!googleButton) {
    return;
  }

  googleButton.addEventListener("click", handleGoogleSignIn);
}

function initializeTripBrowserEvents() {
  tripList?.addEventListener("click", handleTripBrowserClick);
  tripList?.addEventListener("change", handleTripBrowserChange);
}

function setupForms() {
  vaultForm?.addEventListener("submit", handleVaultSubmit);
  tripForm?.addEventListener("submit", handleTripSubmit);
  folderForm?.addEventListener("submit", handleFolderSubmit);
  uploadForm?.addEventListener("submit", handleUploadSubmit);
  textPostForm?.addEventListener("submit", handleTextPostSubmit);
  editPostForm?.addEventListener("submit", handleEditTextPostSubmit);
  editPostCloseButton?.addEventListener("click", resetTextPostEditor);
  editPostCancelButton?.addEventListener("click", resetTextPostEditor);
  editPostBackdrop?.addEventListener("click", resetTextPostEditor);
  videoPreviewCloseButton?.addEventListener("click", resetVideoPreview);
  videoPreviewBackdrop?.addEventListener("click", resetVideoPreview);
  videoPreviewPrevButton?.addEventListener("click", () => navigateVideoPreview(-1));
  videoPreviewNextButton?.addEventListener("click", () => navigateVideoPreview(1));
  signOutButton?.addEventListener("click", handleSignOut);
  adminPanelsToggle?.addEventListener("change", handleAdminPanelsToggleChange);
  mobileMenuToggle?.addEventListener("click", handleMobileMenuToggleClick);
  mobileMenuBackdrop?.addEventListener("click", () => setMobileMenuOpen(false));
  uploadTripSelect?.addEventListener("change", renderAdminSelects);
  textTripSelect?.addEventListener("change", renderAdminSelects);
  friendsDesktopList?.addEventListener("change", handleRoleSelectChange);
  friendsMobileList?.addEventListener("change", handleRoleSelectChange);
  friendsDesktopList?.addEventListener("click", handleProfileActionClick);
  friendsMobileList?.addEventListener("click", handleProfileActionClick);
  window.addEventListener("resize", syncResponsivePanels);
  window.addEventListener("keydown", handleWindowKeydown);
  syncResponsivePanels();
}

function handleAdminPanelsToggleChange(event) {
  setAdminPanelsVisible(Boolean(event.target?.checked));
}

function handleMobileMenuToggleClick() {
  setMobileMenuOpen(!mobileMenuOpen);
}

function handleWindowKeydown(event) {
  if (videoPreviewModalOpen) {
    if (event.key === "Escape") {
      resetVideoPreview();
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      navigateVideoPreview(-1);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      navigateVideoPreview(1);
      return;
    }
  }

  if (event.key === "Escape") {
    if (editPostModalOpen) {
      resetTextPostEditor();
      return;
    }

    setMobileMenuOpen(false);
  }
}

function syncResponsivePanels() {
  const mobileViewport = window.innerWidth < 1280;
  const targetSlot = mobileViewport ? mobileAdminPanelSlot : desktopControlPanelSlot;

  if (adminPanel && targetSlot && adminPanel.parentElement !== targetSlot) {
    targetSlot.appendChild(adminPanel);
  }

  if (!mobileViewport) {
    setMobileMenuOpen(false);
  }
}

function setMobileMenuOpen(nextOpen) {
  const canUseMobileMenu = window.innerWidth < 1280;
  mobileMenuOpen = Boolean(nextOpen && canUseMobileMenu);

  if (mobileMenuPanel) {
    mobileMenuPanel.classList.toggle("hidden", !mobileMenuOpen);
  }

  if (mobileMenuBackdrop) {
    mobileMenuBackdrop.classList.toggle("hidden", !mobileMenuOpen);
  }

  if (mobileMenuToggle) {
    mobileMenuToggle.setAttribute("aria-expanded", String(mobileMenuOpen));
  }
}

function setEditPostModalOpen(nextOpen) {
  editPostModalOpen = Boolean(nextOpen);

  if (editPostModal) {
    editPostModal.classList.toggle("hidden", !editPostModalOpen);
    editPostModal.classList.toggle("flex", editPostModalOpen);
  }
}

function setVideoPreviewModalOpen(nextOpen) {
  videoPreviewModalOpen = Boolean(nextOpen);

  if (videoPreviewModal) {
    videoPreviewModal.classList.toggle("hidden", !videoPreviewModalOpen);
    videoPreviewModal.classList.toggle("flex", videoPreviewModalOpen);
  }
}

function syncAdminPanelsToggle() {
  const shouldShow = Boolean(currentUser?.email && isAdmin());

  if (!shouldShow) {
    adminPanelsVisible = false;
  }

  if (adminPanelsControl) {
    adminPanelsControl.classList.toggle("hidden", !shouldShow);
    adminPanelsControl.classList.toggle("flex", shouldShow);
  }

  if (adminPanelsToggle) {
    adminPanelsToggle.checked = shouldShow && adminPanelsVisible;
  }
}

function setAdminPanelsVisible(visible) {
  const nextVisible = Boolean(visible && isAdmin());

  if (!nextVisible && currentTextPostEdit && !isCurrentUserTextOwner(currentTextPostEdit)) {
    resetTextPostEditor();
  }

  adminPanelsVisible = nextVisible;
  renderAll();
}

async function handleGoogleSignIn() {
  if (!auth) {
    showWarning("Firebase Auth is not ready. Check the Firebase values in .env.");
    return;
  }

  try {
    authDetail.textContent = STRINGS.auth.signingIn;
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(auth, provider);
  } catch (error) {
    authDetail.textContent = getFriendlyAuthMessage(error);
  }
}

async function handleSignOut() {
  try {
    if (auth) {
      await firebaseSignOut(auth);
    }
  } catch (error) {
    authDetail.textContent = getErrorMessage(error, STRINGS.errors.signOutFailed);
  }
}

function subscribeToTrips() {
  const tripsQuery = query(
    collection(db, runtimeConfig.collections.trips),
    orderBy("sortOrder", "asc")
  );

  tripUnsubscribe?.();
  tripUnsubscribe = onSnapshot(
    tripsQuery,
    async (snapshot) => {
      firestoreAccessIssue = false;

      if (snapshot.empty) {
        if (!hasSeenPersistedTrips) {
          needsDefaultTripSeed = true;
          trips = cloneDefaultTrips();
          renderAll();
          if (isAdmin()) {
            await ensureDefaultTrips();
            needsDefaultTripSeed = false;
          }
          return;
        }

        needsDefaultTripSeed = false;
        trips = [];
        syncFolderSubscriptions();
        renderAll();
        return;
      }

      hasSeenPersistedTrips = true;
      needsDefaultTripSeed = false;
      trips = snapshot.docs
        .map((tripDoc, index) =>
          normalizeTrip({ id: tripDoc.id, ...tripDoc.data() }, index)
        )
        .filter((trip) => trip.status !== "deleted");
      syncFolderSubscriptions();
      renderAll();
    },
    (error) => {
      firestoreAccessIssue = isFirestorePermissionError(error);
      trips = cloneDefaultTrips();
      showWarning(getFriendlyFirestoreMessage(error));
      renderAll();
    }
  );
}

function subscribeToFriends() {
  if (!db || !runtimeConfig?.collections?.users || !currentUser) {
    return;
  }

  usersUnsubscribe?.();
  const usersCollection = collection(db, runtimeConfig.collections.users);

  usersUnsubscribe = onSnapshot(
    usersCollection,
    (snapshot) => {
      friendAccessIssue = false;
      friends = snapshot.docs
        .map((userDoc) => normalizeFriend({ id: userDoc.id, ...userDoc.data() }))
        .sort(compareFriends);
      const liveCurrentProfile = friends.find((friend) => friend.uid === currentUser?.uid);

      if (liveCurrentProfile) {
        currentUserProfile = liveCurrentProfile;
      } else if (currentUser?.uid && !isAdminEmail(currentUser?.email)) {
        currentUserProfile = null;
      }

      renderFriendsPanel();
      renderAuth();
    },
    (error) => {
      friendAccessIssue = isFirestorePermissionError(error);
      friends = [];
      showWarning(getFriendlyFriendsMessage(error));
      renderFriendsPanel();
    }
  );
}

function syncFolderSubscriptions() {
  const activeTripIds = new Set(trips.map((trip) => trip.id));

  folderUnsubscribers.forEach((unsubscribe, tripId) => {
    if (!activeTripIds.has(tripId)) {
      unsubscribe();
      folderUnsubscribers.delete(tripId);
      foldersByTrip.delete(tripId);
      pruneItemsForTrip(tripId);
    }
  });

  trips.forEach((trip) => {
    if (folderUnsubscribers.has(trip.id)) {
      return;
    }

    const foldersQuery = query(
      collection(db, runtimeConfig.collections.trips, trip.id, "folders"),
      orderBy("sortOrder", "asc")
    );

    const unsubscribe = onSnapshot(
      foldersQuery,
      async (snapshot) => {
        const folders = snapshot.docs.map((folderDoc, index) =>
          normalizeFolder({ id: folderDoc.id, ...folderDoc.data() }, index)
        );

        if (folders.length === 0) {
          foldersByTrip.set(trip.id, seedFolderDefaultsForTripState(trip));
          renderAll();
          await ensureTripFolders(trip);
          return;
        }

        foldersByTrip.set(trip.id, folders);

        const selectedFolderId = getSelectedFolderId(trip.id);
        if (!folders.some((folder) => folder.id === selectedFolderId)) {
          selectedFolders.set(trip.id, folders[0].id);
        }

        renderAll();
        loadSelectedFolderItems(trip.id);
      },
      (error) => {
        showWarning(getFriendlyFirestoreMessage(error));
      }
    );

    folderUnsubscribers.set(trip.id, unsubscribe);
  });
}

function pruneItemsForTrip(tripId) {
  [...itemsByFolder.keys()].forEach((key) => {
    if (key.startsWith(`${tripId}:`)) {
      itemsByFolder.delete(key);
    }
  });
}

async function ensureDefaultTrips() {
  if (!db || !isAdmin()) {
    return;
  }

  for (const trip of DEFAULT_TRIPS) {
    await setDoc(
      doc(db, runtimeConfig.collections.trips, trip.id),
      {
        label: trip.label,
        slug: trip.slug,
        status: "active",
        sortOrder: trip.sortOrder,
        subtitle: `${trip.slug.toUpperCase()} / FILE SYSTEM READY`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    await ensureTripFolders(trip);
  }
}

async function syncDefaultTripsIfNeeded() {
  if (!needsDefaultTripSeed || !isAdmin()) {
    return;
  }

  await ensureDefaultTrips();
  needsDefaultTripSeed = false;
}

async function ensureTripFolders(trip) {
  if (!db || !isAdmin()) {
    return;
  }

  const folders = trip.folders && trip.folders.length > 0 ? trip.folders : [ROOT_FOLDER_ID];
  const folderPromises = folders.map((folderSlug, index) => {
    const normalizedSlug = folderSlug === ROOT_FOLDER_ID ? ROOT_FOLDER_ID : slugifyFolder(folderSlug);
    return setDoc(
      doc(
        db,
        runtimeConfig.collections.trips,
        trip.id,
        "folders",
        normalizedSlug
      ),
      {
        label: normalizedSlug === ROOT_FOLDER_ID ? trip.slug : normalizedSlug,
        slug: normalizedSlug,
        kind: normalizedSlug === ROOT_FOLDER_ID ? "root" : classifyFolderKind(normalizedSlug),
        sortOrder: normalizedSlug === ROOT_FOLDER_ID ? ROOT_FOLDER_SORT : index,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });

  await Promise.all(folderPromises);
}

async function loadSelectedFolderItems(tripId) {
  const folderId = getSelectedFolderId(tripId);

  if (!folderId || !db) {
    return;
  }

  const cacheKey = buildFolderCacheKey(tripId, folderId);
  const itemsQuery = query(
    collection(
      db,
      runtimeConfig.collections.trips,
      tripId,
      "folders",
      folderId,
      "items"
    ),
    orderBy("createdAt", "desc")
  );

  try {
    const snapshot = await getDocs(itemsQuery);
    const items = snapshot.docs.map((itemDoc) =>
      normalizeItem({ id: itemDoc.id, ...itemDoc.data() })
    );
    itemsByFolder.set(cacheKey, items);
    renderTrips();
  } catch (error) {
    showWarning(getFriendlyFirestoreMessage(error));
  }
}

async function syncUserRecord(user) {
  if (!db || !runtimeConfig?.collections?.users) {
    return null;
  }

  const userRef = doc(db, runtimeConfig.collections.users, user.uid);
  const userSnapshot = await getDoc(userRef);
  const existingData = userSnapshot.exists() ? userSnapshot.data() : null;
  const role = resolveStoredUserRole(existingData?.role, user.email);
  const payload = {
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || "",
    photoURL: user.photoURL || "",
    role,
    isAdmin: isElevatedRole(role),
    lastLoginAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (!userSnapshot.exists()) {
    payload.createdAt = serverTimestamp();
  }

  await setDoc(userRef, payload, { merge: true });

  return normalizeFriend({
    id: user.uid,
    ...existingData,
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || "",
    photoURL: user.photoURL || "",
    role,
  });
}

async function handleTripSubmit(event) {
  event.preventDefault();

  if (!db || !isAdminViewEnabled()) {
    return;
  }

  const formData = new FormData(event.currentTarget);
  const label = sanitizeUpper(formData.get("tripLabel"));
  const slug = slugifyTrip(formData.get("tripSlug"));
  const folderSeeds = parseFolderSeeds(formData.get("tripFolders"));

  if (!label || !slug) {
    return;
  }

  if (trips.some((trip) => trip.id === slug)) {
    authDetail.textContent = `${slug.toUpperCase()} ALREADY EXISTS.`;
    return;
  }

  try {
    await setDoc(doc(db, runtimeConfig.collections.trips, slug), {
      label,
      slug,
      status: "active",
      sortOrder: getNextTripSortOrder(),
      subtitle: `${slug.toUpperCase()} / FILE SYSTEM READY`,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdByUid: currentUser?.uid || "",
    });

    await ensureTripFolders({
      id: slug,
      slug,
      folders: [ROOT_FOLDER_ID, ...folderSeeds],
    });

    event.currentTarget.reset();
  } catch (error) {
    authDetail.textContent = getErrorMessage(error, STRINGS.errors.tripCreateFailed);
  }
}

async function handleFolderSubmit(event) {
  event.preventDefault();

  if (!db || !isAdminViewEnabled()) {
    return;
  }

  const formData = new FormData(event.currentTarget);
  const tripId = String(formData.get("tripId") || "");
  const folderSlug = slugifyFolder(formData.get("folderLabel"));
  const trip = trips.find((item) => item.id === tripId);

  if (!trip || !folderSlug || folderSlug === ROOT_FOLDER_ID) {
    return;
  }

  const existingFolders = getFoldersForTrip(tripId);
  if (existingFolders.some((folder) => folder.id === folderSlug)) {
    authDetail.textContent = `${folderSlug.toUpperCase()}/ ALREADY EXISTS.`;
    return;
  }

  try {
    await setDoc(
      doc(db, runtimeConfig.collections.trips, tripId, "folders", folderSlug),
      {
        label: folderSlug,
        slug: folderSlug,
        kind: classifyFolderKind(folderSlug),
        sortOrder: getNextFolderSortOrder(tripId),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdByUid: currentUser?.uid || "",
      }
    );

    event.currentTarget.reset();
  } catch (error) {
    authDetail.textContent = getErrorMessage(error, STRINGS.errors.folderCreateFailed);
  }
}

async function handleUploadSubmit(event) {
  event.preventDefault();

  if (!canUploadMedia()) {
    showWarning(STRINGS.uploads.signInRequired);
    return;
  }

  if (!db || !storage || !storageReady) {
    showWarning(STRINGS.uploads.storageNotReady);
    return;
  }

  const formData = new FormData(event.currentTarget);
  const tripId = String(formData.get("tripId") || "");
  const folderId = String(formData.get("folderId") || "");
  const files = Array.from(uploadFilesInput?.files || []);
  const description = String(formData.get("description") || "").trim();
  const trip = trips.find((item) => item.id === tripId);
  const folder = getFoldersForTrip(tripId).find((item) => item.id === folderId);

  if (!trip || !folder || files.length === 0) {
    return;
  }

  if (files.some((file) => !isSupportedMediaFile(file))) {
    authDetail.textContent = STRINGS.uploads.onlyMedia;
    return;
  }

  const oversizedVideo = files.find(
    (file) => isVideoFile(file) && Number(file.size || 0) > MAX_VIDEO_SIZE_BYTES
  );
  if (oversizedVideo) {
    authDetail.textContent = `${oversizedVideo.name.toUpperCase()} / ${STRINGS.uploads.maxVideoSize}`;
    return;
  }

  const selectedVideoCount = files.filter((file) => isVideoFile(file)).length;

  if (selectedVideoCount > 0 && !isAdmin()) {
    const recentVideoCount = await countRecentVideoUploads(currentUser.uid);

    if (recentVideoCount + selectedVideoCount > MAX_VIDEO_UPLOADS_PER_DAY) {
      authDetail.textContent = STRINGS.uploads.maxVideos;
      return;
    }
  }

  const uploadPromises = files.map((file, index) =>
    uploadMediaFile(trip, folder, file, index, description)
  );

  const results = await Promise.allSettled(uploadPromises);
  const successCount = results.filter((result) => result.status === "fulfilled").length;
  const failureCount = results.length - successCount;

  authDetail.textContent = STRINGS.uploads.summary(successCount, failureCount);

  event.currentTarget.reset();
  await loadSelectedFolderItems(tripId);
}

async function uploadMediaFile(trip, folder, file, index, description = "") {
  const generatedName = buildStorageFileName(file, index);
  const storagePath =
    folder.id === ROOT_FOLDER_ID
      ? `trips/${trip.slug}/${generatedName}`
      : `trips/${trip.slug}/${folder.slug}/${generatedName}`;
  const ref = storageRef(storage, storagePath);
  const jobId = `${Date.now()}-${index}-${generatedName}`;

  pushUploadJob({
    id: jobId,
    name: generatedName,
    status: "uploading",
    progress: 0,
  });

  const task = uploadBytesResumable(ref, file, {
    contentType: file.type || "application/octet-stream",
  });

  await new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snapshot) => {
        const progress =
          snapshot.totalBytes > 0
            ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            : 0;
        updateUploadJob(jobId, { progress, status: "uploading" });
      },
      (error) => {
        updateUploadJob(jobId, {
          status: "error",
          message: getFriendlyStorageMessage(error),
        });
        reject(error);
      },
      () => resolve()
    );
  });

  const downloadURL = await getDownloadURL(task.snapshot.ref);
  const mediaCategory = classifyMediaCategory(file.type);
  let posterDownloadURL = "";
  let posterStoragePath = "";

  if (mediaCategory === "video") {
    const posterBlob = await createVideoPoster(file);

    if (posterBlob) {
      posterStoragePath = `${storagePath}.jpg`;
      const posterRef = storageRef(storage, posterStoragePath);
      const posterTask = uploadBytesResumable(posterRef, posterBlob, {
        contentType: "image/jpeg",
      });

      await new Promise((resolve, reject) => {
        posterTask.on("state_changed", undefined, reject, resolve);
      });

      posterDownloadURL = await getDownloadURL(posterTask.snapshot.ref);
    }
  }

  const itemId = `file-${buildUniqueStamp(index)}`;
  const itemRef = doc(
    db,
    runtimeConfig.collections.trips,
    trip.id,
    "folders",
    folder.id,
    "items",
    itemId
  );

  await setDoc(itemRef, {
    kind: "file",
    mediaCategory,
    name: generatedName,
    originalName: file.name,
    description,
    mediaDateMs: Number(file.lastModified || 0),
    mimeType: file.type || "application/octet-stream",
    extension: getFileExtension(generatedName),
    size: file.size,
    downloadURL,
    storagePath,
    posterDownloadURL,
    posterStoragePath,
    authorLabel: getUploadAuthorLabel(),
    uploadedByUid: currentUser?.uid || "",
    uploadedByEmail: currentUser?.email || "",
    createdAt: serverTimestamp(),
    createdAtMs: Date.now(),
    createdByUid: currentUser?.uid || "",
    createdByEmail: currentUser?.email || "",
  });

  updateUploadJob(jobId, {
    status: "done",
    progress: 100,
    message: STRINGS.uploads.uploadComplete,
  });
}

async function countRecentVideoUploads(userId) {
  if (!db || !userId) {
    return 0;
  }

  try {
    const snapshot = await getDocs(
      query(collectionGroup(db, "items"), where("uploadedByUid", "==", userId))
    );
    const cutoffMs = Date.now() - 24 * 60 * 60 * 1000;

    return snapshot.docs.filter((itemDoc) => {
      const item = normalizeItem({ id: itemDoc.id, ...itemDoc.data() });
      return item.mediaCategory === "video" && item.createdAtMs >= cutoffMs;
    }).length;
  } catch {
    return 0;
  }
}

async function createVideoPoster(file) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    let completed = false;
    let timeoutId = 0;

    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.defaultMuted = true;
    video.src = objectUrl;

    const finish = (value) => {
      if (completed) {
        return;
      }

      completed = true;
      cleanup();
      resolve(value);
    };

    const cleanup = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
      video.load();
    };

    const drawFrame = () => {
      try {
        const canvas = document.createElement("canvas");
        const sourceWidth = video.videoWidth || 320;
        const sourceHeight = video.videoHeight || 180;
        const previewHeight = 64;
        const previewWidth = Math.max(
          96,
          Math.round((sourceWidth / sourceHeight) * previewHeight)
        );
        canvas.width = previewWidth;
        canvas.height = previewHeight;
        const context = canvas.getContext("2d");

        if (!context) {
          finish(null);
          return;
        }

        drawMediaCover(context, video, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          finish(blob || null);
        }, "image/jpeg", 0.82);
      } catch {
        finish(null);
      }
    };

    const drawWhenReady = () => {
      if (video.readyState >= 2 && !completed) {
        window.requestAnimationFrame(drawFrame);
      }
    };

    video.addEventListener("loadeddata", drawWhenReady, { once: true });
    video.addEventListener("canplay", drawWhenReady, { once: true });
    video.addEventListener("error", () => {
      finish(null);
    }, { once: true });

    timeoutId = window.setTimeout(() => {
      finish(null);
    }, 6000);
  });
}

function isSupportedMediaFile(file) {
  return isVideoFile(file) || isImageFile(file);
}

function isVideoFile(file) {
  return String(file?.type || "").startsWith("video/");
}

function isImageFile(file) {
  return String(file?.type || "").startsWith("image/");
}

function classifyMediaCategory(mimeType) {
  if (String(mimeType || "").startsWith("video/")) {
    return "video";
  }

  if (String(mimeType || "").startsWith("image/")) {
    return "image";
  }

  return "file";
}

function getUploadAuthorLabel() {
  if (isAdmin()) {
    return STRINGS.brand || "100GIGZ";
  }

  return (
    String(currentUser?.displayName || "").trim() ||
    String(currentUser?.email || "").split("@")[0] ||
    STRINGS.members.unknown
  );
}

function resolveItemAuthorLabel(item) {
  if (item.authorLabel) {
    return item.authorLabel;
  }

  if (isAdminEmail(item.createdByEmail)) {
    return STRINGS.brand;
  }

  return (
    inferNameFromEmail(item.createdByEmail) ||
    item.createdByUid ||
    ""
  );
}

async function handleTextPostSubmit(event) {
  event.preventDefault();

  if (!canUploadMedia()) {
    showWarning(STRINGS.uploads.textSignInRequired);
    return;
  }

  if (!db) {
    return;
  }

  const formData = new FormData(event.currentTarget);
  const tripId = String(formData.get("tripId") || "");
  const folderId = String(formData.get("folderId") || "");
  const title = sanitizeUpper(formData.get("title"));
  const body = String(formData.get("body") || "").trim();

  if (!tripId || !folderId || !title || !body) {
    return;
  }

  try {
    const itemRef = doc(
      db,
      runtimeConfig.collections.trips,
      tripId,
      "folders",
      folderId,
      "items",
      `post-${buildUniqueStamp()}`
    );

    await setDoc(itemRef, {
      kind: "text",
      title,
      body,
      name: `${slugifyFolder(title)}.txt`,
      mimeType: "text/plain",
      authorLabel: getUploadAuthorLabel(),
      createdAt: serverTimestamp(),
      createdAtMs: Date.now(),
      createdByUid: currentUser?.uid || "",
      createdByEmail: currentUser?.email || "",
    });

    event.currentTarget.reset();
    await loadSelectedFolderItems(tripId);
  } catch (error) {
    authDetail.textContent = getErrorMessage(error, STRINGS.errors.textPostFailed);
  }
}

async function handleEditTextPostSubmit(event) {
  event.preventDefault();

  if (!db || !currentTextPostEdit) {
    return;
  }

  const formData = new FormData(event.currentTarget);
  const title = sanitizeUpper(formData.get("title"));
  const body = String(formData.get("body") || "").trim();

  if (!title || !body) {
    return;
  }

  try {
    await setDoc(
      doc(
        db,
        runtimeConfig.collections.trips,
        currentTextPostEdit.tripId,
        "folders",
        currentTextPostEdit.folderId,
        "items",
        currentTextPostEdit.itemId
      ),
      {
        kind: "text",
        title,
        body,
        name: `${slugifyFolder(title)}.txt`,
        mimeType: "text/plain",
        authorLabel: currentTextPostEdit.authorLabel || getUploadAuthorLabel(),
        createdByUid: currentTextPostEdit.createdByUid || currentUser?.uid || "",
        createdByEmail: currentTextPostEdit.createdByEmail || currentUser?.email || "",
        updatedAt: serverTimestamp(),
        updatedByUid: currentUser?.uid || "",
        updatedByEmail: currentUser?.email || "",
      },
      { merge: true }
    );

    const tripId = currentTextPostEdit.tripId;
    resetTextPostEditor();
    await loadSelectedFolderItems(tripId);
  } catch (error) {
    authDetail.textContent = getErrorMessage(error, STRINGS.errors.textPostFailed);
  }
}

function beginTextPostEdit(tripId, folderId, item) {
  if (!item || item.kind !== "text" || !canEditTextPost(item)) {
    return;
  }

  currentTextPostEdit = {
    tripId,
    folderId,
    itemId: item.id,
    createdByUid: item.createdByUid,
    createdByEmail: item.createdByEmail,
    authorLabel: item.authorLabel || resolveItemAuthorLabel(item),
  };

  const trip = trips.find((entry) => entry.id === tripId);
  const folder = getFoldersForTrip(tripId).find((entry) => entry.id === folderId);

  if (editPostTitleInput) {
    editPostTitleInput.value = item.title || item.name || "";
  }

  if (editPostBodyInput) {
    editPostBodyInput.value = item.bodyText || "";
  }

  if (editPostContext) {
    editPostContext.textContent = buildFolderPathLabel(trip, folder);
  }

  setEditPostModalOpen(true);
  window.requestAnimationFrame(() => {
    editPostTitleInput?.focus();
    editPostTitleInput?.select();
  });
}

function resetTextPostEditor() {
  currentTextPostEdit = null;
  editPostForm?.reset();

  if (editPostContext) {
    editPostContext.textContent = "";
  }

  setEditPostModalOpen(false);
}

function openVideoPreview(tripId, folderId, itemId) {
  if (!videoPreviewPlayer || !tripId || !folderId || !itemId) {
    return;
  }

  currentVideoPreviewContext = { tripId, folderId, itemId };
  const previewState = getCurrentVideoPreviewState();

  if (!previewState) {
    resetVideoPreview();
    return;
  }

  syncVideoPreviewNavigation(previewState);
  videoPreviewPlayer.pause();
  videoPreviewPlayer.src = previewState.currentItem.downloadURL;
  videoPreviewPlayer.currentTime = 0;
  videoPreviewPlayer.load();
  setVideoPreviewModalOpen(true);

  window.requestAnimationFrame(() => {
    const playPromise = videoPreviewPlayer.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  });
}

function navigateVideoPreview(direction) {
  const previewState = getCurrentVideoPreviewState();

  if (!previewState) {
    return;
  }

  const nextItem = previewState.items[previewState.currentIndex + direction];

  if (!nextItem) {
    return;
  }

  openVideoPreview(previewState.tripId, previewState.folderId, nextItem.id);
}

function resetVideoPreview() {
  currentVideoPreviewContext = null;
  syncVideoPreviewNavigation(null);

  if (videoPreviewPlayer) {
    videoPreviewPlayer.pause();
    videoPreviewPlayer.removeAttribute("src");
    videoPreviewPlayer.load();
  }

  setVideoPreviewModalOpen(false);
}

function getCurrentVideoPreviewState() {
  if (!currentVideoPreviewContext) {
    return null;
  }

  const { tripId, folderId, itemId } = currentVideoPreviewContext;
  const items = getFolderVideoItems(tripId, folderId);
  const currentIndex = items.findIndex((item) => item.id === itemId);

  if (currentIndex === -1) {
    return null;
  }

  return {
    tripId,
    folderId,
    itemId,
    items,
    currentIndex,
    currentItem: items[currentIndex],
  };
}

function getFolderVideoItems(tripId, folderId) {
  return getSortedItemsForFolder(tripId, folderId, getItemSortMode(tripId, folderId)).filter(
    (item) => item.kind === "file" && item.mimeType.startsWith("video/")
  );
}

function syncVideoPreviewNavigation(previewState = getCurrentVideoPreviewState()) {
  if (videoPreviewTitle) {
    videoPreviewTitle.textContent = previewState
      ? getItemDisplayName(previewState.currentItem)
      : "";
  }

  if (videoPreviewPrevButton) {
    videoPreviewPrevButton.disabled = !previewState || previewState.currentIndex === 0;
  }

  if (videoPreviewNextButton) {
    videoPreviewNextButton.disabled =
      !previewState || previewState.currentIndex >= previewState.items.length - 1;
  }
}

function isCurrentUserTextOwner(item) {
  return Boolean(
    currentUser?.uid &&
      (item?.createdByUid === currentUser.uid ||
        (!item?.createdByUid &&
          item?.createdByEmail &&
          currentUser?.email &&
          item.createdByEmail === currentUser.email))
  );
}

function canEditTextPost(item) {
  return Boolean(
    item?.kind === "text" &&
      currentUser?.uid &&
      (isAdminViewEnabled() || isCurrentUserTextOwner(item))
  );
}

async function handleRoleSelectChange(event) {
  const select = event.target.closest("[data-action='role-select']");

  if (!select || !db || !runtimeConfig?.collections?.users || !isAdminViewEnabled()) {
    return;
  }

  const userId = String(select.getAttribute("data-user-id") || "");
  const nextRole = normalizeUserRole(select.value);
  const friend = friends.find((item) => item.uid === userId || item.id === userId);

  if (!userId || !friend || !nextRole) {
    return;
  }

  const lockedOwner = isAdminEmail(friend.email);
  const roleToStore = lockedOwner ? ROLE_OWNER : nextRole;

  select.disabled = true;

  try {
    await setDoc(
      doc(db, runtimeConfig.collections.users, userId),
      {
        uid: friend.uid || userId,
        email: friend.email,
        displayName: friend.displayName || "",
        photoURL: friend.photoURL || "",
        role: roleToStore,
        isAdmin: isElevatedRole(roleToStore),
        updatedAt: serverTimestamp(),
        updatedByUid: currentUser?.uid || "",
        updatedByEmail: currentUser?.email || "",
      },
      { merge: true }
    );

    authDetail.textContent = `${getFriendLabel(friend)} / ${getRoleLabel(roleToStore)}`;
  } catch (error) {
    select.value = friend.role;
    authDetail.textContent = getErrorMessage(error, STRINGS.errors.roleUpdateFailed);
  } finally {
    select.disabled = false;
  }
}

function handleTripBrowserClick(event) {
  const videoPreviewTrigger = event.target.closest("[data-action='preview-video']");

  if (videoPreviewTrigger) {
    handleVideoPreviewClick(videoPreviewTrigger);
    return;
  }

  const tripToggleTrigger = event.target.closest("[data-action='toggle-trip']");

  if (tripToggleTrigger) {
    handleTripToggleClick(tripToggleTrigger);
    return;
  }

  const tripMoveTrigger = event.target.closest("[data-action='move-trip']");

  if (tripMoveTrigger) {
    handleTripMoveClick(tripMoveTrigger);
    return;
  }

  const tripDeleteTrigger = event.target.closest("[data-action='delete-trip']");

  if (tripDeleteTrigger) {
    handleTripDeleteClick(tripDeleteTrigger);
    return;
  }

  const deleteTrigger = event.target.closest("[data-action='delete-item']");

  if (deleteTrigger) {
    handleItemDeleteClick(deleteTrigger);
    return;
  }

  const editTrigger = event.target.closest("[data-action='edit-item']");

  if (editTrigger) {
    handleItemEditClick(editTrigger);
    return;
  }

  const trigger = event.target.closest("[data-action='select-folder']");

  if (!trigger) {
    return;
  }

  const tripId = trigger.getAttribute("data-trip-id");
  const folderId = trigger.getAttribute("data-folder-id");

  if (!tripId || !folderId) {
    return;
  }

  selectedFolders.set(tripId, folderId);
  renderTrips();
  renderAdminSelects();
  loadSelectedFolderItems(tripId);
}

function handleTripToggleClick(trigger) {
  const tripId = String(trigger.getAttribute("data-trip-id") || "");

  if (!tripId) {
    return;
  }

  expandedTrips.set(tripId, !isTripExpanded(tripId));
  renderTrips();
}

function handleVideoPreviewClick(trigger) {
  const tripId = String(trigger.getAttribute("data-trip-id") || "");
  const folderId = String(trigger.getAttribute("data-folder-id") || "");
  const itemId = String(trigger.getAttribute("data-item-id") || "");

  if (!tripId || !folderId || !itemId) {
    return;
  }

  openVideoPreview(tripId, folderId, itemId);
}

function handleTripBrowserChange(event) {
  const sortSelect = event.target.closest("[data-action='sort-items']");

  if (!sortSelect) {
    return;
  }

  const tripId = String(sortSelect.getAttribute("data-trip-id") || "");
  const folderId = getSelectedFolderId(tripId);
  const sortMode = normalizeItemSortMode(sortSelect.value);

  if (!tripId || !folderId) {
    return;
  }

  itemSortPreferences.set(buildFolderCacheKey(tripId, folderId), sortMode);
  renderTrips();
}

function handleItemEditClick(trigger) {
  const tripId = String(trigger.getAttribute("data-trip-id") || "");
  const folderId = String(trigger.getAttribute("data-folder-id") || "");
  const itemId = String(trigger.getAttribute("data-item-id") || "");
  const item = getItemsForFolder(tripId, folderId).find((entry) => entry.id === itemId);

  if (!tripId || !folderId || !itemId || !item) {
    return;
  }

  beginTextPostEdit(tripId, folderId, item);
}

async function handleTripMoveClick(trigger) {
  if (!db || !isAdminViewEnabled()) {
    return;
  }

  const tripId = String(trigger.getAttribute("data-trip-id") || "");
  const direction = String(trigger.getAttribute("data-direction") || "");
  const tripIndex = trips.findIndex((entry) => entry.id === tripId);

  if (tripIndex === -1) {
    return;
  }

  const swapIndex = direction === "up" ? tripIndex - 1 : tripIndex + 1;

  if (swapIndex < 0 || swapIndex >= trips.length) {
    return;
  }

  const currentTrip = trips[tripIndex];
  const swapTrip = trips[swapIndex];

  trigger.disabled = true;

  try {
    await Promise.all([
      setDoc(
        doc(db, runtimeConfig.collections.trips, currentTrip.id),
        {
          sortOrder: swapTrip.sortOrder,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ),
      setDoc(
        doc(db, runtimeConfig.collections.trips, swapTrip.id),
        {
          sortOrder: currentTrip.sortOrder,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ),
    ]);
  } catch (error) {
    authDetail.textContent = getErrorMessage(error, STRINGS.errors.tripMoveFailed);
  } finally {
    trigger.disabled = false;
  }
}

async function handleTripDeleteClick(trigger) {
  if (!db || !isAdminViewEnabled()) {
    return;
  }

  const tripId = String(trigger.getAttribute("data-trip-id") || "");
  const trip = trips.find((entry) => entry.id === tripId);

  if (!trip) {
    return;
  }

  if ((!hasSeenPersistedTrips || needsDefaultTripSeed) && isDefaultTripId(trip.id)) {
    await ensureDefaultTrips();
    hasSeenPersistedTrips = true;
    needsDefaultTripSeed = false;
  }

  const confirmed = window.confirm(
    `Delete ${trip.slug}/ and all folders, posts, clips, and storage files?`
  );
  if (!confirmed) {
    return;
  }

  trigger.disabled = true;

  try {
    authDetail.textContent = `DELETING ${trip.slug.toUpperCase()}/`;
    await deleteTripCascade(trip);
    authDetail.textContent = STRINGS.trips.removed(trip.slug);
  } catch (error) {
    authDetail.textContent = getErrorMessage(error, STRINGS.errors.tripDeleteFailed);
    trigger.disabled = false;
  }
}

async function deleteTripCascade(trip) {
  if (storage) {
    await deleteStoragePrefix(storageRef(storage, `trips/${trip.slug}`));
  }

  const tripRef = doc(db, runtimeConfig.collections.trips, trip.id);
  const foldersSnapshot = await getDocs(
    collection(db, runtimeConfig.collections.trips, trip.id, "folders")
  );

  for (const folderDoc of foldersSnapshot.docs) {
    const itemsSnapshot = await getDocs(
      collection(
        db,
        runtimeConfig.collections.trips,
        trip.id,
        "folders",
        folderDoc.id,
        "items"
      )
    );

    for (const itemDoc of itemsSnapshot.docs) {
      const item = normalizeItem({ id: itemDoc.id, ...itemDoc.data() });

      if (item.kind === "file" && item.storagePath) {
        if (!storage) {
          throw new Error("Storage is not ready for trip deletion.");
        }

        try {
          await deleteObject(storageRef(storage, item.storagePath));
        } catch (error) {
          if (!isStorageObjectMissing(error)) {
            throw error;
          }
        }
      }

      await deleteDoc(itemDoc.ref);
    }

    await deleteDoc(folderDoc.ref);
  }

  await setDoc(
    tripRef,
    {
      label: trip.label,
      slug: trip.slug,
      status: "deleted",
      sortOrder: Number.isFinite(Number(trip.sortOrder)) ? Number(trip.sortOrder) : 0,
      deletedAt: serverTimestamp(),
      deletedByUid: currentUser?.uid || "",
      deletedByEmail: currentUser?.email || "",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  foldersByTrip.delete(trip.id);
  selectedFolders.delete(trip.id);
  pruneItemsForTrip(trip.id);
}

function isDefaultTripId(tripId) {
  return DEFAULT_TRIPS.some((trip) => trip.id === tripId);
}

async function deleteStoragePrefix(prefixRef) {
  const listing = await listAll(prefixRef);

  for (const childPrefix of listing.prefixes) {
    await deleteStoragePrefix(childPrefix);
  }

  for (const itemRef of listing.items) {
    try {
      await deleteObject(itemRef);
    } catch (error) {
      if (!isStorageObjectMissing(error)) {
        throw error;
      }
    }
  }
}

async function handleItemDeleteClick(trigger) {
  if (!db || !isAdminViewEnabled()) {
    return;
  }

  const tripId = String(trigger.getAttribute("data-trip-id") || "");
  const folderId = String(trigger.getAttribute("data-folder-id") || "");
  const itemId = String(trigger.getAttribute("data-item-id") || "");
  const items = getItemsForFolder(tripId, folderId);
  const item = items.find((entry) => entry.id === itemId);

  if (!tripId || !folderId || !itemId || !item) {
    return;
  }

  const confirmed = window.confirm(`Delete ${getItemDisplayName(item) || "this item"}?`);
  if (!confirmed) {
    return;
  }

  trigger.disabled = true;

  try {
    if (item.kind === "file" && item.storagePath) {
      if (!storage) {
        throw new Error("Storage is not ready.");
      }

      try {
        await deleteObject(storageRef(storage, item.storagePath));
      } catch (error) {
        if (!isStorageObjectMissing(error)) {
          throw error;
        }
      }

      if (item.posterStoragePath) {
        try {
          await deleteObject(storageRef(storage, item.posterStoragePath));
        } catch (error) {
          if (!isStorageObjectMissing(error)) {
            throw error;
          }
        }
      }
    }

    await deleteDoc(
      doc(
        db,
        runtimeConfig.collections.trips,
        tripId,
        "folders",
        folderId,
        "items",
        itemId
      )
    );

    authDetail.textContent = STRINGS.items.itemRemoved(
      getItemDisplayName(item) || "ITEM"
    );
    await loadSelectedFolderItems(tripId);
  } catch (error) {
    authDetail.textContent = getErrorMessage(error, STRINGS.errors.itemDeleteFailed);
    trigger.disabled = false;
  }
}

function handleProfileActionClick(event) {
  const trigger = event.target.closest("[data-action='delete-profile']");

  if (!trigger) {
    return;
  }

  handleProfileDeleteClick(trigger);
}

async function handleProfileDeleteClick(trigger) {
  if (!db || !runtimeConfig?.collections?.users || !isAdminViewEnabled()) {
    return;
  }

  const userId = String(trigger.getAttribute("data-user-id") || "");
  const friend = friends.find((item) => item.uid === userId || item.id === userId);

  if (!userId || !friend || isProtectedProfile(friend)) {
    return;
  }

  const confirmed = window.confirm(
    STRINGS.members.deleteProfileConfirm(getFriendLabel(friend))
  );
  if (!confirmed) {
    return;
  }

  trigger.disabled = true;

  try {
    await deleteDoc(doc(db, runtimeConfig.collections.users, userId));
    authDetail.textContent = STRINGS.members.deleteProfileDone(getFriendLabel(friend));
  } catch (error) {
    authDetail.textContent = getErrorMessage(error, STRINGS.errors.profileDeleteFailed);
    trigger.disabled = false;
  }
}

function renderAll() {
  syncResponsivePanels();
  renderAuth();
  renderTripCount();
  renderTrips();
  renderAdminSelects();
  renderUploadQueue();
  renderFriendsPanel();
}

function renderAuth() {
  const signedIn = Boolean(currentUser?.email);
  syncAdminPanelsToggle();

  if (!runtimeConfig) {
    authStatus.textContent = STRINGS.auth.publicView;
    authDetail.textContent = STRINGS.auth.loading;
    signOutButton?.classList.add("hidden");
    adminPanel?.classList.add("hidden");
    setGoogleButtonVisible(false);
    return;
  }

  if (!firestoreReady) {
    authStatus.textContent = STRINGS.auth.publicView;
    authDetail.textContent = STRINGS.auth.configMissing;
    signOutButton?.classList.add("hidden");
    adminPanel?.classList.add("hidden");
    setGoogleButtonVisible(false);
    return;
  }

  if (!signedIn) {
    authStatus.textContent = STRINGS.auth.publicView;
    authDetail.textContent = firestoreAccessIssue ? STRINGS.auth.rulesBlocked : "";
    signOutButton?.classList.add("hidden");
    adminPanel?.classList.add("hidden");
    setGoogleButtonVisible(true);
    return;
  }

  signOutButton?.classList.remove("hidden");
  setGoogleButtonVisible(false);

  if (isAdmin()) {
    authStatus.textContent = isAdminViewEnabled()
      ? STRINGS.auth.adminView
      : STRINGS.auth.memberView;
    authDetail.textContent = currentUser.email;
    adminPanel?.classList.remove("hidden");
  } else {
    authStatus.textContent = STRINGS.auth.memberView;
    authDetail.textContent = friendAccessIssue
      ? `${currentUser.email} / ${STRINGS.auth.rulesBlocked}`
      : currentUser.email;
    adminPanel?.classList.remove("hidden");
  }

  syncControlPanelVisibility();
}

function renderTripCount() {
  if (!tripCount) {
    return;
  }

  tripCount.textContent = padCount(trips.length, STRINGS.trips.countLabel);
}

function syncControlPanelVisibility() {
  const signedIn = canUploadMedia();
  const adminMode = signedIn && isAdminViewEnabled();

  adminPanel?.classList.toggle("hidden", !signedIn);
  tripForm?.classList.toggle("hidden", !adminMode);
  folderForm?.classList.toggle("hidden", !adminMode);
  textPostForm?.classList.toggle("hidden", !signedIn);

  if (controlPanelTitle) {
    controlPanelTitle.textContent = adminMode
      ? STRINGS.admin.title
      : STRINGS.uploads.panelTitle;
  }
}

function renderTrips() {
  if (!tripList) {
    return;
  }

  const adminMode = isAdminViewEnabled();

  if (trips.length === 0) {
    tripList.innerHTML = `
      <section class="border border-white/10 bg-white/[0.02] p-5">
        <p class="font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-sm uppercase tracking-[0.2em] text-stone-300/60">
          ${escapeHtml(STRINGS.trips.noTrips)}
        </p>
      </section>
    `;
    return;
  }

  tripList.innerHTML = trips
    .map((trip, index) => {
      const folders = getFoldersForTrip(trip.id);
      const selectedFolderId = getSelectedFolderId(trip.id);
      const selectedFolder = folders.find((folder) => folder.id === selectedFolderId) || folders[0];
      const activeFolderId = selectedFolder?.id || ROOT_FOLDER_ID;
      const sortMode = getItemSortMode(trip.id, activeFolderId);
      const items = getSortedItemsForFolder(trip.id, activeFolderId, sortMode);
      const pathLabel = buildFolderPathLabel(trip, selectedFolder);
      const expanded = isTripExpanded(trip.id);
      const tripToggleLabel = expanded
        ? STRINGS.trips.collapseTrip
        : STRINGS.trips.expandTrip;

      return `
        <section class="border border-white/10 bg-white/[0.02]">
          <div class="flex flex-col gap-3 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
            <div class="space-y-2">
              <p class="font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.72rem] uppercase tracking-[0.3em] text-stone-300/55">${String(
                index + 1
              ).padStart(4, "0")}</p>
              <h2 class="text-2xl uppercase tracking-[0.18em] text-stone-100 sm:text-3xl">${escapeHtml(
                `${trip.slug}/`
              )}</h2>
              <p class="font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-xs uppercase tracking-[0.18em] text-stone-300/60">${escapeHtml(
                trip.label
              )}</p>
            </div>
            <div class="flex items-center gap-3">
              <button
                type="button"
                data-action="toggle-trip"
                data-trip-id="${escapeHtml(trip.id)}"
                aria-expanded="${expanded ? "true" : "false"}"
                class="border border-white/10 px-3 py-2 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.62rem] uppercase tracking-[0.18em] text-stone-200 transition hover:border-white/30 hover:bg-white/[0.04]"
              >
                ${tripToggleLabel}
              </button>
              <div class="font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.72rem] uppercase tracking-[0.2em] text-stone-300/60">
                ${padCount(folders.length, STRINGS.trips.foldersLabel)}
              </div>
              ${
                adminMode
                  ? `
                    <button
                      type="button"
                      data-action="move-trip"
                      data-direction="up"
                      data-trip-id="${escapeHtml(trip.id)}"
                      class="border border-white/10 px-3 py-2 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.62rem] uppercase tracking-[0.18em] text-stone-200 transition hover:border-white/30 hover:bg-white/[0.04]"
                      ${index === 0 ? "disabled" : ""}
                    >
                      ${STRINGS.trips.moveTripUp}
                    </button>
                    <button
                      type="button"
                      data-action="move-trip"
                      data-direction="down"
                      data-trip-id="${escapeHtml(trip.id)}"
                      class="border border-white/10 px-3 py-2 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.62rem] uppercase tracking-[0.18em] text-stone-200 transition hover:border-white/30 hover:bg-white/[0.04]"
                      ${index === trips.length - 1 ? "disabled" : ""}
                    >
                      ${STRINGS.trips.moveTripDown}
                    </button>
                    <button
                      type="button"
                      data-action="delete-trip"
                      data-trip-id="${escapeHtml(trip.id)}"
                      class="border border-white/10 px-3 py-2 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.62rem] uppercase tracking-[0.18em] text-stone-200 transition hover:border-red-300/35 hover:bg-red-300/10 hover:text-red-100"
                    >
                      ${STRINGS.trips.deleteTrip}
                    </button>
                  `
                  : ""
              }
            </div>
          </div>

          <div class="${expanded ? "grid" : "hidden"} gap-5 p-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:p-5">
            <aside class="border border-white/10 bg-black/25 p-4">
              <p class="font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.7rem] uppercase tracking-[0.24em] text-stone-300/65">
                Folders
              </p>
              <div class="mt-4 flex flex-col gap-2">
                ${folders
                  .map((folder) => {
                    const isSelected = folder.id === selectedFolderId;
                    return `
                      <button
                        type="button"
                        data-action="select-folder"
                        data-trip-id="${escapeHtml(trip.id)}"
                        data-folder-id="${escapeHtml(folder.id)}"
                        class="flex items-center justify-between border px-3 py-3 text-left font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.72rem] uppercase tracking-[0.18em] transition ${
                          isSelected
                            ? "border-stone-100 bg-white/[0.08] text-stone-100"
                            : "border-white/10 bg-white/[0.02] text-stone-300/78 hover:border-white/30 hover:bg-white/[0.04]"
                        }"
                      >
                        <span>${escapeHtml(buildFolderButtonLabel(trip, folder))}</span>
                        <span>${escapeHtml(folder.kind)}</span>
                      </button>
                    `;
                  })
                  .join("")}
              </div>
            </aside>

            <div class="min-w-0 border border-white/10 bg-black/25 p-4">
              <div class="flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p class="text-xl font-bold tracking-[0.08em] text-stone-100">${escapeHtml(
                    pathLabel
                  )}</p>
                </div>
                <div class="flex flex-col gap-3 sm:items-end">
                  <label class="flex items-center gap-3 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.66rem] uppercase tracking-[0.18em] text-stone-300/62">
                    <span>${STRINGS.items.sortLabel}</span>
                    <select
                      data-action="sort-items"
                      data-trip-id="${escapeHtml(trip.id)}"
                      class="border border-white/10 bg-black/45 px-2 py-2 text-[0.62rem] uppercase tracking-[0.16em] text-stone-200 outline-none transition focus:border-white/30"
                    >
                      ${renderItemSortOptions(sortMode)}
                    </select>
                  </label>
                  <p class="font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.72rem] uppercase tracking-[0.2em] text-stone-300/60">
                    ${padCount(items.length, STRINGS.trips.objectsLabel)}
                  </p>
                </div>
              </div>

              <div class="mt-4 max-w-full overflow-hidden rounded-sm border border-white/8 bg-black/18">
                <div class="max-h-[68vh] max-w-full overflow-x-auto overflow-y-auto overscroll-x-contain xl:max-h-[75vh]">
                  <table class="w-max min-w-[48rem] border-collapse font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-xs tracking-[0.1em] text-stone-200/85 xl:min-w-full">
                    <thead class="bg-white/[0.02] text-stone-300/55 uppercase">
                      <tr>
                        <th class="sticky top-0 min-w-[18rem] border-b border-white/10 bg-neutral-950 px-3 py-3 text-left font-normal">${STRINGS.items.previewColumn}</th>
                        <th class="sticky top-0 min-w-[10rem] border-b border-white/10 bg-neutral-950 px-3 py-3 text-left font-normal">${STRINGS.items.nameColumn}</th>
                        <th class="sticky top-0 w-24 min-w-[5.5rem] border-b border-white/10 bg-neutral-950 px-3 py-3 text-left font-normal">${STRINGS.items.typeColumn}</th>
                        <th class="sticky top-0 min-w-[8rem] border-b border-white/10 bg-neutral-950 px-3 py-3 text-left font-normal">${STRINGS.items.authorColumn}</th>
                        <th class="sticky top-0 min-w-[12rem] border-b border-white/10 bg-neutral-950 px-3 py-3 text-left font-normal">${STRINGS.items.metaColumn}</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${renderItemRows(items, trip.id, activeFolderId)}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>
      `;
    })
    .join("");
}

function getItemDisplayName(item) {
  if (item?.kind === "text") {
    return String(item?.title || item?.name || "UNTITLED");
  }

  const originalName = String(item?.originalName || "").trim();
  if (originalName) {
    return originalName;
  }

  const storedName = String(item?.name || "").trim();
  const cleanedName = storedName.replace(/^\d{13,20}-[a-z0-9]{6}-/i, "");

  return cleanedName || storedName || "untitled";
}

function renderItemRows(items, tripId, folderId) {
  if (items.length === 0) {
    return `
      <tr class="text-stone-300/45 uppercase">
        <td class="border-b border-white/8 px-3 py-4">${STRINGS.items.noObjects}</td>
        <td class="border-b border-white/8 px-3 py-4">----</td>
        <td class="border-b border-white/8 px-3 py-4">${STRINGS.items.emptyName}</td>
        <td class="border-b border-white/8 px-3 py-4">${STRINGS.items.emptyName}</td>
        <td class="border-b border-white/8 px-3 py-4">${STRINGS.items.emptyName}</td>
      </tr>
    `;
  }

  return items
    .map((item) => {
      const displayName = getItemDisplayName(item);
      const typeLabel =
        item.kind === "text"
          ? STRINGS.items.post
          : item.extension || simplifyMimeType(item.mimeType) || "FILE";
      const preview = renderItemPreview(item, tripId, folderId);
      const author = renderItemAuthor(item);
      const meta = renderItemMeta(item, tripId, folderId);
      const nameMarkup =
        item.kind === "text"
          ? `<div class="text-stone-100">${escapeHtml(item.title || item.name)}</div>`
          : `<a class="text-sky-300 underline-offset-4 hover:underline" href="${escapeHtml(
              item.downloadURL
            )}" target="_blank" rel="noreferrer">${escapeHtml(displayName)}</a>`;

      return `
        <tr class="align-top transition hover:bg-white/[0.03]">
          <td class="min-w-[18rem] border-b border-white/8 px-3 py-4">${preview}</td>
          <td class="min-w-[10rem] border-b border-white/8 px-3 py-4">${nameMarkup}</td>
          <td class="w-24 min-w-[5.5rem] border-b border-white/8 px-3 py-4 uppercase text-stone-300/72">${escapeHtml(
            typeLabel
          )}</td>
          <td class="min-w-[8rem] border-b border-white/8 px-3 py-4 uppercase text-stone-300/72">${author}</td>
          <td class="min-w-[12rem] border-b border-white/8 px-3 py-4 uppercase text-stone-300/72">${meta}</td>
        </tr>
      `;
    })
    .join("");
}

function renderItemMeta(item, tripId, folderId) {
  const summary =
    item.kind === "text"
      ? STRINGS.items.textPost
      : `${formatBytes(item.size)} / ${escapeHtml(getItemDisplayName(item))}`;
  const descriptionMarkup =
    item.kind === "file" && item.description
      ? `<div class="mt-2 normal-case text-[0.64rem] leading-5 tracking-[0.04em] text-stone-300/72">${escapeHtml(
          item.description
        )}</div>`
      : "";
  const editButton = canEditTextPost(item)
    ? `
      <button
        type="button"
        data-action="edit-item"
        data-trip-id="${escapeHtml(tripId)}"
        data-folder-id="${escapeHtml(folderId)}"
        data-item-id="${escapeHtml(item.id)}"
        class="mt-3 inline-flex border border-white/10 px-2 py-1 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.58rem] uppercase tracking-[0.18em] text-stone-200 transition hover:border-white/30 hover:bg-white/[0.04]"
      >
        ${STRINGS.items.edit}
      </button>
    `
    : "";
  const deleteButton = isAdminViewEnabled()
    ? `
      <button
        type="button"
        data-action="delete-item"
        data-trip-id="${escapeHtml(tripId)}"
        data-folder-id="${escapeHtml(folderId)}"
        data-item-id="${escapeHtml(item.id)}"
        class="mt-3 inline-flex border border-white/10 px-2 py-1 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.58rem] uppercase tracking-[0.18em] text-stone-200 transition hover:border-red-300/35 hover:bg-red-300/10 hover:text-red-100"
      >
        ${STRINGS.items.delete}
      </button>
    `
    : "";

  return `${summary}${descriptionMarkup}${editButton}${deleteButton}`;
}

function renderItemPreview(item, tripId, folderId) {
  const displayName = getItemDisplayName(item);

  if (item.kind === "text") {
    return `<p class="min-w-[18rem] max-w-[30rem] whitespace-pre-wrap break-words text-[0.78rem] leading-6 tracking-[0.04em] text-stone-300/78 sm:min-w-[22rem]">${escapeHtml(
      item.bodyText
    )}</p>`;
  }

  if (item.mimeType.startsWith("image/")) {
    return `
      <a href="${escapeHtml(item.downloadURL)}" target="_blank" rel="noreferrer">
        <img src="${escapeHtml(item.downloadURL)}" alt="${escapeHtml(
      displayName
    )}" class="h-20 w-20 object-cover ring-1 ring-white/10">
      </a>
    `;
  }

  if (item.mimeType.startsWith("video/")) {
    if (item.posterDownloadURL) {
      return `
        <button
          type="button"
          data-action="preview-video"
          data-trip-id="${escapeHtml(tripId)}"
          data-folder-id="${escapeHtml(folderId)}"
          data-item-id="${escapeHtml(item.id)}"
          class="inline-block transition hover:opacity-90"
          aria-label="Preview ${escapeHtml(displayName)}"
        >
          <img src="${escapeHtml(item.posterDownloadURL)}" alt="${escapeHtml(
        displayName
      )}" class="block h-16 w-28 max-h-16 overflow-hidden object-cover ring-1 ring-white/10">
        </button>
      `;
    }

    return `
      <button
        type="button"
        data-action="preview-video"
        data-trip-id="${escapeHtml(tripId)}"
        data-folder-id="${escapeHtml(folderId)}"
        data-item-id="${escapeHtml(item.id)}"
        class="inline-flex h-16 w-28 max-h-16 items-center justify-center border border-white/10 bg-black/35 text-[0.62rem] uppercase tracking-[0.16em] text-stone-300/72 transition hover:border-white/25 hover:text-stone-100"
        aria-label="Preview ${escapeHtml(displayName)}"
      >
        VIDEO
      </button>
    `;
  }

  return `<a class="text-sky-300 underline-offset-4 hover:underline uppercase" href="${escapeHtml(
    item.downloadURL
  )}" target="_blank" rel="noreferrer">${STRINGS.uploads.genericFile}</a>`;
}

function renderItemAuthor(item) {
  const authorLabel = resolveItemAuthorLabel(item);

  return authorLabel
    ? `<span class="text-stone-200/82">${escapeHtml(authorLabel)}</span>`
    : `<span class="text-stone-300/40">${STRINGS.items.emptyName}</span>`;
}

function renderAdminSelects() {
  syncTripSelect(folderTripSelect, trips);
  syncTripSelect(uploadTripSelect, trips);
  syncTripSelect(textTripSelect, trips);
  syncFolderSelect(
    uploadFolderSelect,
    uploadTripSelect?.value || trips[0]?.id || ""
  );
  syncFolderSelect(
    textFolderSelect,
    textTripSelect?.value || trips[0]?.id || ""
  );
}

function renderUploadQueue() {
  if (!uploadStatusList) {
    return;
  }

  if (uploadJobs.length === 0) {
    uploadStatusList.innerHTML = `
      <div class="border border-white/10 bg-black/20 px-3 py-3 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.72rem] uppercase tracking-[0.18em] text-stone-300/60">
        ${STRINGS.uploads.queueEmpty}
      </div>
    `;
    return;
  }

  uploadStatusList.innerHTML = uploadJobs
    .slice(0, 12)
    .map((job) => {
      const tone =
        job.status === "error"
          ? "border-red-300/20 bg-red-300/8 text-red-100/85"
          : job.status === "done"
            ? "border-emerald-300/20 bg-emerald-300/8 text-emerald-100/85"
            : "border-white/10 bg-black/20 text-stone-200/80";

      return `
        <div class="border px-3 py-3 ${tone}">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p class="font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.72rem] uppercase tracking-[0.18em]">${escapeHtml(
              job.name
            )}</p>
            <p class="font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.7rem] uppercase tracking-[0.18em]">${escapeHtml(
              `${String(job.progress).padStart(3, "0")}% / ${job.status}`
            )}</p>
          </div>
          ${
            job.message
              ? `<p class="mt-2 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.68rem] uppercase tracking-[0.14em]">${escapeHtml(
                  job.message
                )}</p>`
              : ""
          }
        </div>
      `;
    })
    .join("");
}

function renderFriendsPanel() {
  const signedIn = Boolean(currentUser?.email);
  const visibleMembers = getVisibleMembers();
  const countLabel = padCount(visibleMembers.length, STRINGS.members.countLabel);
  const statusText = !signedIn
    ? ""
    : friendAccessIssue
      ? STRINGS.auth.rulesBlocked
      : visibleMembers.length === 0
        ? STRINGS.members.empty
        : "";

  if (friendsDesktopCount) {
    friendsDesktopCount.textContent = countLabel;
  }

  if (friendsMobileCount) {
    friendsMobileCount.textContent = countLabel;
  }

  if (friendsDesktopStatus) {
    friendsDesktopStatus.textContent = statusText;
    friendsDesktopStatus.classList.toggle("hidden", !statusText);
  }

  if (friendsMobileStatus) {
    friendsMobileStatus.textContent = statusText;
    friendsMobileStatus.classList.toggle("hidden", !statusText);
  }

  const markup = !signedIn
    ? `
      <div class="border border-white/10 bg-black/20 px-3 py-3 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.72rem] uppercase tracking-[0.18em] text-stone-300/55">
        ${STRINGS.members.guestPrompt}
      </div>
    `
    : visibleMembers.length === 0
      ? `
        <div class="border border-white/10 bg-black/20 px-3 py-3 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.72rem] uppercase tracking-[0.18em] text-stone-300/55">
          ${STRINGS.members.empty}
        </div>
      `
      : visibleMembers.map((friend) => renderFriendCard(friend)).join("");

  if (friendsDesktopList) {
    friendsDesktopList.innerHTML = markup;
  }

  if (friendsMobileList) {
    friendsMobileList.innerHTML = markup;
  }
}

function syncTripSelect(selectElement, tripListState) {
  if (!selectElement) {
    return;
  }

  const previousValue = selectElement.value;
  selectElement.innerHTML = tripListState
    .map(
      (trip) =>
        `<option value="${escapeHtml(trip.id)}">${escapeHtml(
          `${trip.slug}/`
        )}</option>`
    )
    .join("");

  if (tripListState.some((trip) => trip.id === previousValue)) {
    selectElement.value = previousValue;
  }
}

function syncFolderSelect(selectElement, tripId) {
  if (!selectElement) {
    return;
  }

  const previousValue = selectElement.value;
  const folders = getFoldersForTrip(tripId);

  selectElement.innerHTML = folders
    .map(
      (folder) =>
        `<option value="${escapeHtml(folder.id)}">${escapeHtml(
          buildFolderSelectLabel(tripId, folder)
        )}</option>`
    )
    .join("");

  if (folders.some((folder) => folder.id === previousValue)) {
    selectElement.value = previousValue;
  }
}

function getSelectedFolderId(tripId) {
  const folders = getFoldersForTrip(tripId);
  if (selectedFolders.has(tripId)) {
    return selectedFolders.get(tripId);
  }

  const defaultFolderId = folders[0]?.id || ROOT_FOLDER_ID;
  selectedFolders.set(tripId, defaultFolderId);
  return defaultFolderId;
}

function getFoldersForTrip(tripId) {
  const folders = foldersByTrip.get(tripId);
  if (folders && folders.length > 0) {
    return folders;
  }

  const trip = trips.find((item) => item.id === tripId);
  if (!trip) {
    return [];
  }

  return seedFolderDefaultsForTripState(trip);
}

function seedFolderDefaultsForTripState(trip) {
  const folderSeeds =
    trip.folders && trip.folders.length > 0 ? trip.folders : [ROOT_FOLDER_ID];

  return folderSeeds.map((folderSlug, index) =>
    normalizeFolder(
      {
        id: folderSlug === ROOT_FOLDER_ID ? ROOT_FOLDER_ID : slugifyFolder(folderSlug),
        label:
          folderSlug === ROOT_FOLDER_ID
            ? trip.slug
            : slugifyFolder(folderSlug),
        slug: folderSlug,
        kind:
          folderSlug === ROOT_FOLDER_ID
            ? "root"
            : classifyFolderKind(folderSlug),
        sortOrder: folderSlug === ROOT_FOLDER_ID ? ROOT_FOLDER_SORT : index,
      },
      index
    )
  );
}

function isTripExpanded(tripId) {
  if (expandedTrips.has(tripId)) {
    return expandedTrips.get(tripId);
  }

  expandedTrips.set(tripId, true);
  return true;
}

function getItemsForFolder(tripId, folderId) {
  return itemsByFolder.get(buildFolderCacheKey(tripId, folderId)) || [];
}

function getSortedItemsForFolder(tripId, folderId, sortMode = ITEM_SORT_MEDIA_DATE_ASC) {
  const items = getItemsForFolder(tripId, folderId);
  return [...items].sort((left, right) => compareItems(left, right, sortMode));
}

function renderItemSortOptions(selectedMode) {
  return [
    [ITEM_SORT_MEDIA_DATE_DESC, STRINGS.items.sortMediaDateDesc],
    [ITEM_SORT_MEDIA_DATE_ASC, STRINGS.items.sortMediaDateAsc],
    [ITEM_SORT_RECENTLY_ADDED, STRINGS.items.sortRecentlyAdded],
  ]
    .map(([value, label]) => {
      const selected = value === selectedMode ? "selected" : "";
      return `<option value="${escapeHtml(value)}" ${selected}>${escapeHtml(label)}</option>`;
    })
    .join("");
}

function getItemSortMode(tripId, folderId) {
  const cacheKey = buildFolderCacheKey(tripId, folderId);
  return itemSortPreferences.get(cacheKey) || ITEM_SORT_MEDIA_DATE_ASC;
}

function normalizeItemSortMode(value) {
  return [
    ITEM_SORT_MEDIA_DATE_DESC,
    ITEM_SORT_MEDIA_DATE_ASC,
    ITEM_SORT_RECENTLY_ADDED,
  ].includes(value)
    ? value
    : ITEM_SORT_MEDIA_DATE_ASC;
}

function compareItems(left, right, sortMode) {
  const sequenceComparison = compareSequenceNamedItems(left, right, sortMode);
  if (sequenceComparison !== null) {
    return sequenceComparison;
  }

  if (sortMode === ITEM_SORT_MEDIA_DATE_ASC) {
    return compareAscending(
      getSortableMediaDateMs(left),
      getSortableMediaDateMs(right),
      left,
      right
    );
  }

  if (sortMode === ITEM_SORT_RECENTLY_ADDED) {
    return compareDescending(left.createdAtMs, right.createdAtMs, left, right);
  }

  return compareDescending(
    getSortableMediaDateMs(left),
    getSortableMediaDateMs(right),
    left,
    right
  );
}

function compareSequenceNamedItems(left, right, sortMode) {
  if (
    sortMode === ITEM_SORT_RECENTLY_ADDED ||
    left?.kind !== "file" ||
    right?.kind !== "file"
  ) {
    return null;
  }

  const leftSequence = getItemSequenceNumber(left);
  const rightSequence = getItemSequenceNumber(right);

  if (leftSequence === null || rightSequence === null || leftSequence === rightSequence) {
    return null;
  }

  return sortMode === ITEM_SORT_MEDIA_DATE_ASC
    ? leftSequence - rightSequence
    : rightSequence - leftSequence;
}

function getItemSequenceNumber(item) {
  const baseName = getItemDisplayName(item).replace(/\.[^.]+$/, "").trim();
  return /^\d+$/.test(baseName) ? Number.parseInt(baseName, 10) : null;
}

function getSortableMediaDateMs(item) {
  if (item.kind === "file" && item.mediaDateMs > 0) {
    return item.mediaDateMs;
  }

  return item.createdAtMs;
}

function compareDescending(leftValue, rightValue, leftItem, rightItem) {
  if (rightValue !== leftValue) {
    return rightValue - leftValue;
  }

  return compareTieBreakers(leftItem, rightItem);
}

function compareAscending(leftValue, rightValue, leftItem, rightItem) {
  if (leftValue !== rightValue) {
    return leftValue - rightValue;
  }

  return compareTieBreakers(leftItem, rightItem);
}

function compareTieBreakers(leftItem, rightItem) {
  if (rightItem.createdAtMs !== leftItem.createdAtMs) {
    return rightItem.createdAtMs - leftItem.createdAtMs;
  }

  return String(leftItem.name || leftItem.title || "").localeCompare(
    String(rightItem.name || rightItem.title || "")
  );
}

function buildFolderCacheKey(tripId, folderId) {
  return `${tripId}:${folderId}`;
}

function buildFolderPathLabel(trip, folder) {
  if (!trip) {
    return "/";
  }

  if (!folder || folder.id === ROOT_FOLDER_ID) {
    return `${trip.slug}/`;
  }

  return `${trip.slug}/${folder.slug}/`;
}

function buildFolderButtonLabel(trip, folder) {
  if (!folder || !trip) {
    return "/";
  }

  return folder.id === ROOT_FOLDER_ID ? `${trip.slug}/` : `${folder.slug}/`;
}

function buildFolderSelectLabel(tripId, folder) {
  const trip = trips.find((item) => item.id === tripId);
  if (!trip) {
    return folder.slug;
  }

  return folder.id === ROOT_FOLDER_ID ? `${trip.slug}/` : `${folder.slug}/`;
}

function pushUploadJob(job) {
  uploadJobs = [job, ...uploadJobs].slice(0, 20);
  renderUploadQueue();
}

function updateUploadJob(jobId, updates) {
  uploadJobs = uploadJobs.map((job) =>
    job.id === jobId ? { ...job, ...updates } : job
  );
  renderUploadQueue();
}

function normalizeTrip(trip, index) {
  return {
    id: slugifyTrip(trip?.id || trip?.slug || `trip-${Date.now()}`),
    label: sanitizeUpper(trip?.label || "UNTITLED TRIP"),
    slug: slugifyTrip(trip?.slug || trip?.id || trip?.label || `trip-${Date.now()}`),
    status: String(trip?.status || "active").toLowerCase(),
    sortOrder: Number.isFinite(Number(trip?.sortOrder))
      ? Number(trip.sortOrder)
      : index,
    subtitle: sanitizeUpper(trip?.subtitle || "FILE SYSTEM READY"),
    folders: Array.isArray(trip?.folders)
      ? trip.folders.map((folder) =>
          folder === ROOT_FOLDER_ID ? ROOT_FOLDER_ID : slugifyFolder(folder)
        )
      : undefined,
  };
}

function normalizeFolder(folder, index) {
  const slug =
    folder?.id === ROOT_FOLDER_ID
      ? ROOT_FOLDER_ID
      : slugifyFolder(folder?.slug || folder?.label || folder?.id || `folder-${index}`);

  return {
    id: slug,
    slug,
    label:
      slug === ROOT_FOLDER_ID
        ? slugifyTrip(folder?.label || "root")
        : slug,
    kind:
      slug === ROOT_FOLDER_ID
        ? "root"
        : String(folder?.kind || classifyFolderKind(slug)).toLowerCase(),
    sortOrder: Number.isFinite(Number(folder?.sortOrder))
      ? Number(folder.sortOrder)
      : index,
  };
}

function normalizeItem(item) {
  const mimeType = String(item?.mimeType || "text/plain");
  const kind = item?.kind === "file" ? "file" : "text";
  const createdAtMs = coerceTimestampToMs(item?.createdAt, item?.createdAtMs);
  const bodyText =
    kind === "text"
      ? String(item?.body || "").replace(/\r\n/g, "\n").trim()
      : "";

  return {
    id: String(item?.id || Date.now()),
    kind,
    mediaCategory: String(
      item?.mediaCategory || classifyMediaCategory(mimeType)
    ).toLowerCase(),
    name: String(item?.name || item?.title || "untitled"),
    originalName: item?.originalName ? String(item.originalName) : "",
    title: item?.title ? sanitizeUpper(item.title) : "",
    bodyText,
    description: String(item?.description || "").trim(),
    mediaDateMs: Number(item?.mediaDateMs || 0),
    mimeType,
    extension: String(item?.extension || getFileExtension(String(item?.name || ""))).toLowerCase(),
    size: Number(item?.size || 0),
    downloadURL: String(item?.downloadURL || ""),
    storagePath: String(item?.storagePath || ""),
    posterDownloadURL: String(item?.posterDownloadURL || ""),
    posterStoragePath: String(item?.posterStoragePath || ""),
    authorLabel: String(item?.authorLabel || ""),
    uploadedByUid: String(item?.uploadedByUid || item?.createdByUid || ""),
    createdByEmail: String(item?.createdByEmail || ""),
    createdByUid: String(item?.createdByUid || ""),
    createdAtMs,
  };
}

function normalizeFriend(user) {
  const email = String(user?.email || "").trim().toLowerCase();
  const name = String(user?.displayName || "")
    .trim()
    .replace(/\s+/g, " ");
  const role = resolveStoredUserRole(user?.role, email);

  return {
    id: String(user?.id || user?.uid || email || Date.now()),
    uid: String(user?.uid || ""),
    email,
    displayName: name,
    photoURL: String(user?.photoURL || ""),
    role,
    isAdmin: isElevatedRole(role),
  };
}

function compareFriends(left, right) {
  const leftLabel = getFriendLabel(left).toLowerCase();
  const rightLabel = getFriendLabel(right).toLowerCase();
  return leftLabel.localeCompare(rightLabel);
}

function renderFriendCard(friend) {
  const label = getFriendLabel(friend);
  const badge = getRoleLabel(friend.role);
  const isCurrentUser = Boolean(currentUser?.uid && friend.uid === currentUser.uid);
  const canEditRole = isAdminViewEnabled();
  const canDeleteProfile = isAdminViewEnabled() && !isProtectedProfile(friend);
  const roleMarkup = canEditRole
    ? renderFriendControls(friend, canDeleteProfile)
    : `<span class="border border-white/10 px-2 py-1 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.58rem] uppercase tracking-[0.18em] text-stone-300/75">${escapeHtml(
        badge
      )}</span>`;

  return `
    <article class="border border-white/10 bg-black/20 px-3 py-3">
      <div class="flex items-center gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <p class="truncate text-sm uppercase tracking-[0.14em] text-stone-100">${escapeHtml(label)}</p>
            ${isCurrentUser ? `<span class="border border-white/10 px-1.5 py-0.5 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.58rem] uppercase tracking-[0.18em] text-stone-300/70">${STRINGS.members.you}</span>` : ""}
          </div>
        </div>
        ${roleMarkup}
      </div>
    </article>
  `;
}

function renderFriendControls(friend, canDeleteProfile) {
  return `
    <div class="flex flex-col items-end gap-2">
      ${renderRoleSelect(friend)}
      ${
        canDeleteProfile
          ? `
            <button
              type="button"
              data-action="delete-profile"
              data-user-id="${escapeHtml(friend.uid || friend.id)}"
              class="border border-white/10 px-2 py-1 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.58rem] uppercase tracking-[0.18em] text-stone-300/75 transition hover:border-red-300/35 hover:bg-red-300/10 hover:text-red-100"
            >
              ${STRINGS.members.deleteProfile}
            </button>
          `
          : ""
      }
    </div>
  `;
}

function renderRoleSelect(friend) {
  const lockedOwner = isAdminEmail(friend.email);
  const options = getAssignableRoles(friend).map((role) => {
    const selected = role === friend.role ? "selected" : "";
    return `<option value="${escapeHtml(role)}" ${selected}>${escapeHtml(
      getRoleLabel(role)
    )}</option>`;
  });

  return `
    <select
      data-action="role-select"
      data-user-id="${escapeHtml(friend.uid || friend.id)}"
      class="border border-white/10 bg-black/40 px-2 py-2 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.58rem] uppercase tracking-[0.18em] text-stone-200 outline-none transition focus:border-white/30"
      ${lockedOwner ? "disabled" : ""}
    >
      ${options.join("")}
    </select>
  `;
}

function getFriendLabel(friend) {
  return (
    friend.displayName ||
    inferNameFromEmail(friend.email) ||
    STRINGS.members.unknown
  );
}

function isProtectedProfile(friend) {
  return isAdminEmail(friend.email) || friend.uid === currentUser?.uid;
}

function getRoleLabel(role) {
  if (role === ROLE_FRIEND) {
    return STRINGS.members.role.friend;
  }

  if (role === ROLE_ADMIN) {
    return STRINGS.members.role.admin;
  }

  if (role === ROLE_OWNER) {
    return STRINGS.members.role.owner;
  }

  return STRINGS.members.role.friend;
}

function cloneDefaultTrips() {
  return DEFAULT_TRIPS.map((trip) => ({ ...trip }));
}

function isAdmin() {
  return isAdminEmail(currentUser?.email) || isElevatedRole(getCurrentUserRole());
}

function isAdminViewEnabled() {
  return isAdmin() && adminPanelsVisible;
}

function canUploadMedia() {
  return Boolean(
    currentUser?.uid && (isAdminEmail(currentUser?.email) || currentUserProfile)
  );
}

function isAdminEmail(email) {
  const adminEmails = (runtimeConfig?.adminEmails || []).map((value) =>
    String(value).trim().toLowerCase()
  );
  return Boolean(email && adminEmails.includes(String(email).toLowerCase()));
}

function getCurrentUserRole() {
  if (!currentUser?.uid) {
    return isAdminEmail(currentUser?.email) ? ROLE_OWNER : ROLE_FRIEND;
  }

  const currentFriend = friends.find((friend) => friend.uid === currentUser.uid);
  return currentUserProfile?.role || currentFriend?.role || resolveStoredUserRole(null, currentUser?.email);
}

function getAssignableRoles(friend) {
  if (isAdminEmail(friend.email)) {
    return [ROLE_OWNER];
  }

  return [ROLE_FRIEND, ROLE_ADMIN];
}

function resolveStoredUserRole(role, email) {
  if (isAdminEmail(email)) {
    return ROLE_OWNER;
  }

  return normalizeUserRole(role) === ROLE_ADMIN ? ROLE_ADMIN : ROLE_FRIEND;
}

function normalizeUserRole(role) {
  const value = String(role || "").trim().toLowerCase();
  return [ROLE_FRIEND, ROLE_ADMIN, ROLE_OWNER].includes(value)
    ? value
    : ROLE_FRIEND;
}

function isElevatedRole(role) {
  return role === ROLE_ADMIN || role === ROLE_OWNER;
}

function getVisibleMembers() {
  return friends;
}

function isStorageObjectMissing(error) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";

  return code === "storage/object-not-found";
}

function hasFirebaseConfig(firebaseConfig) {
  const requiredKeys = ["apiKey", "authDomain", "projectId", "appId"];
  return requiredKeys.every((key) => Boolean(firebaseConfig?.[key]));
}

function showWarning(message) {
  if (!authWarning) {
    return;
  }

  authWarning.classList.remove("hidden");
  authWarning.textContent = message;
}

function setGoogleButtonVisible(visible) {
  if (!googleButton) {
    return;
  }

  googleButton.classList.toggle("hidden", !visible);
}

function getNextTripSortOrder() {
  return (
    trips.reduce((max, trip) => Math.max(max, Number(trip.sortOrder) || 0), -1) + 1
  );
}

function getNextFolderSortOrder(tripId) {
  return (
    getFoldersForTrip(tripId).reduce(
      (max, folder) => Math.max(max, Number(folder.sortOrder) || 0),
      ROOT_FOLDER_SORT
    ) + 1
  );
}

function classifyFolderKind(folderSlug) {
  return DAY_FOLDERS.includes(String(folderSlug).toLowerCase()) ? "day" : "custom";
}

function parseFolderSeeds(value) {
  const normalized = String(value || "")
    .split(",")
    .map((entry) => slugifyFolder(entry))
    .filter(Boolean)
    .filter((entry) => entry !== ROOT_FOLDER_ID);

  return [...new Set(normalized)];
}

function buildStorageFileName(file, index) {
  const extension = getFileExtension(file.name);
  const safeBase = sanitizeFileBaseName(file.name);
  const timestamp = buildUniqueStamp(index);

  return extension ? `${timestamp}-${safeBase}.${extension}` : `${timestamp}-${safeBase}`;
}

function buildUniqueStamp(index = 0) {
  const randomSegment = Math.random().toString(36).slice(2, 8);
  return `${Date.now()}${String(index).padStart(4, "0")}-${randomSegment}`;
}

function sanitizeFileBaseName(filename) {
  const withoutExtension = String(filename || "").replace(/\.[^.]+$/, "");
  const sanitized = withoutExtension
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || "file";
}

function getFileExtension(filename) {
  const match = String(filename || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
}

function simplifyMimeType(mimeType) {
  if (!mimeType) {
    return "";
  }

  const parts = String(mimeType).split("/");
  return parts[1] || parts[0] || "";
}

function slugifyTrip(value) {
  const input = String(value || "").trim().toLowerCase();
  if (!input) {
    return "";
  }

  return input
    .replace(/montreal/g, "mtl")
    .replace(/victoria/g, "vic")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function slugifyFolder(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sanitizeUpper(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function formatBytes(bytes) {
  const size = Number(bytes || 0);

  if (!size) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(
    Math.floor(Math.log(size) / Math.log(1024)),
    units.length - 1
  );
  const value = size / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function coerceTimestampToMs(timestampValue, fallbackValue = 0) {
  if (timestampValue && typeof timestampValue.toMillis === "function") {
    return timestampValue.toMillis();
  }

  if (Number.isFinite(Number(timestampValue))) {
    return Number(timestampValue);
  }

  if (Number.isFinite(Number(fallbackValue))) {
    return Number(fallbackValue);
  }

  return 0;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inferNameFromEmail(email) {
  const localPart = String(email || "")
    .trim()
    .split("@")[0]
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim();

  if (!localPart) {
    return "";
  }

  return localPart
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function startLoadingAnimation() {
  if (!loadingText) {
    return;
  }

    loadingText.textContent = "LOADING...";
}

function startLogoPulse() {
  if (!logo) {
    return;
  }

  let pulse = false;

  window.setInterval(() => {
    pulse = !pulse;
    logo.classList.toggle("opacity-95", pulse);
    logo.classList.toggle("translate-x-px", pulse);
    logo.classList.toggle("opacity-100", !pulse);
    logo.classList.toggle("translate-x-0", !pulse);
  }, 1400);
}

function getErrorMessage(error, fallback) {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return fallback;
}

function isFirestorePermissionError(error) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";

  return code === "permission-denied" || code === "firestore/permission-denied";
}

function getFriendlyFirestoreMessage(error) {
  if (isFirestorePermissionError(error)) {
    return STRINGS.firebase.firestoreRulesBlocked;
  }

  return `FIREBASE: ${getErrorMessage(
    error,
    "COULD NOT SYNC FILE SYSTEM FROM FIRESTORE."
  )}`.toUpperCase();
}

function getFriendlyFriendsMessage(error) {
  if (isFirestorePermissionError(error)) {
    return STRINGS.firebase.friendsRulesBlocked;
  }

  return `FIREBASE: ${getErrorMessage(
    error,
    "COULD NOT LOAD MEMBERS PANEL."
  )}`.toUpperCase();
}

function getFriendlyAuthMessage(error) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";

  if (code === "auth/configuration-not-found") {
    return STRINGS.firebase.googleConfigMissing;
  }

  if (code === "auth/operation-not-allowed") {
    return STRINGS.firebase.googleOperationNotAllowed;
  }

  if (code === "auth/unauthorized-domain") {
    return STRINGS.firebase.googleUnauthorizedDomain;
  }

  if (code === "auth/popup-blocked") {
    return STRINGS.firebase.googlePopupBlocked;
  }

  if (code === "auth/popup-closed-by-user") {
    return STRINGS.firebase.googlePopupClosed;
  }

  return `FIREBASE: ${getErrorMessage(error, "GOOGLE SIGN-IN FAILED.")}`.toUpperCase();
}

function getFriendlyStorageMessage(error) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  const rawMessage = getErrorMessage(error, "").toLowerCase();

  if (code === "storage/unauthorized") {
    return STRINGS.firebase.storageUnauthorized;
  }

  if (code === "storage/bucket-not-found") {
    return STRINGS.firebase.storageBucketMissing;
  }

  if (code === "storage/canceled") {
    return STRINGS.firebase.storageCanceled;
  }

  if (code === "storage/unknown" || rawMessage.includes("cors") || rawMessage.includes("xmlhttprequest")) {
    return STRINGS.firebase.storageUnknown;
  }

  if (code === "storage/retry-limit-exceeded") {
    return STRINGS.firebase.storageTimedOut;
  }

  return `FIREBASE STORAGE: ${getErrorMessage(error, "UPLOAD FAILED.")}`.toUpperCase();
}
