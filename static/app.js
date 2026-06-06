import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
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
  writeBatch,
  where,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  listAll,
  ref as storageRef,
  uploadBytesResumable,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-storage.js";
import { STRINGS, padCount } from "./strings.js";

const DAY_FOLDERS = ["thu", "fri", "sat", "sun", "mon"];
const DEFAULT_TRIPS = [
  {
    id: "mtl-25",
    label: "MONTREAL 25",
    slug: "mtl-25",
    tripNumber: 2,
    sortOrder: 1,
    folders: ["thu", "fri", "sat", "sun", "mon", "movie"],
  },
  {
    id: "vic-24",
    label: "VICTORIA 24",
    slug: "vic-24",
    tripNumber: 1,
    sortOrder: 0,
    folders: [],
  },
];

const siteShell = document.getElementById("site-shell");
const vaultGate = document.getElementById("vault-gate");
const appLoadingOverlay = document.getElementById("app-loading-overlay");
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
const footerTickerTrack = document.getElementById("footer-ticker-track");
const authStatus = document.getElementById("auth-status");
const authDetail = document.getElementById("auth-detail");
const authWarning = document.getElementById("auth-warning");
const signOutButton = document.getElementById("sign-out-button");
const googleButton = document.getElementById("google-signin-button");
const scrollBanner = document.getElementById("scroll-banner");
const scrollBannerContext = document.getElementById("scroll-banner-context");
const headerRouteContext = document.getElementById("header-route-context");
const uploadQueuePanel = document.getElementById("upload-queue-panel");
const adminPanel = document.getElementById("admin-panel");
const adminPanelsControl = document.getElementById("admin-panels-control");
const adminPanelsToggle = document.getElementById("admin-panels-toggle");
const adminPanelsToggleText = document.getElementById("admin-panels-toggle-text");
const bannerAdminPanelsControl = document.getElementById("banner-admin-panels-control");
const bannerAdminPanelsToggle = document.getElementById("banner-admin-panels-toggle");
const bannerAdminPanelsToggleText = document.getElementById("banner-admin-panels-toggle-text");
const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
const mobileMenuToggleLabel = document.getElementById("mobile-menu-toggle-label");
const mobileMenuPanel = document.getElementById("mobile-menu-panel");
const mobileMenuBackdrop = document.getElementById("mobile-menu-backdrop");
const scrollBannerMobileMenuSlot = document.getElementById("scroll-banner-mobile-menu-slot");
const headerMobileMenuSlot = document.getElementById("header-mobile-menu-slot");
const bannerRouteToggleLink = document.getElementById("banner-route-toggle-link");
const bannerGoogleButton = document.getElementById("banner-google-signin-button");
const bannerSignOutButton = document.getElementById("banner-sign-out-button");
const mobileAccessPanelSlot = document.getElementById("mobile-access-panel-slot");
const mobileAdminPanelSlot = document.getElementById("mobile-admin-panel-slot");
const desktopAccessPanelSlot = document.getElementById("desktop-access-panel-slot");
const desktopControlPanelSlot = document.getElementById("desktop-control-panel-slot");
const authPanel = document.getElementById("auth-panel");
const friendsMobilePanel = document.getElementById("friends-mobile-panel");
const friendsMobileInlineShell = document.getElementById("friends-mobile-inline-shell");
const friendsMobileInlineStatus = document.getElementById("friends-mobile-inline-status");
const friendsMobileInlineList = document.getElementById("friends-mobile-inline-list");
const friendsMobileInlineCount = document.getElementById("friends-mobile-inline-count");
const friendsMobileInlineTitle = document.getElementById("friends-mobile-inline-title");
const authAccessLabel = document.getElementById("auth-access-label");
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
const desktopRouteToggleLink = document.getElementById("desktop-route-toggle-link");
const archivePage = document.getElementById("archive-page");
const profilePage = document.getElementById("profile-page");
const profilePageTitle = document.getElementById("profile-page-title");
const profilePageSubtitle = document.getElementById("profile-page-subtitle");
const profilePageHelper = document.getElementById("profile-page-helper");
const profilePageStatus = document.getElementById("profile-page-status");
const profileNameDisplay = document.getElementById("profile-name-display");
const profileRouteDisplay = document.getElementById("profile-route-display");
const profileGoogleNameDisplay = document.getElementById("profile-google-name-display");
const profilePostCountDisplay = document.getElementById("profile-post-count-display");
const profileImagePreview = document.getElementById("profile-image-preview");
const profileImageForm = document.getElementById("profile-image-form");
const profileImageInput = document.getElementById("profile-image-input");
const profileImageSubmit = document.getElementById("profile-image-submit");
const profileCurrentImageLabel = document.getElementById("profile-current-image-label");
const profileDetailsForm = document.getElementById("profile-details-form");
const profileDisplayNameInput = document.getElementById("profile-display-name-input");
const profileRouteInput = document.getElementById("profile-route-input");
const profileDetailsSubmit = document.getElementById("profile-details-submit");
const profileEmptyState = document.getElementById("profile-empty-state");
const profileTripList = document.getElementById("profile-trip-list");

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
const uploadFileNameListShell = document.getElementById("upload-file-name-list-shell");
const uploadFileNameList = document.getElementById("upload-file-name-list");
const uploadDescriptionInput = document.getElementById("upload-description-input");
const uploadDescriptionLabel = document.getElementById("upload-description-label");
const uploadAuthorModeShell = document.getElementById("upload-author-mode-shell");
const uploadAuthorModeSelect = document.getElementById("upload-author-mode-select");
const textTitleInput = document.getElementById("text-title-input");
const textBodyInput = document.getElementById("text-body-input");
const textPostFormTitle = document.getElementById("text-post-form-title");
const textPostSubmitButton = document.getElementById("text-post-submit-button");
const textAuthorModeShell = document.getElementById("text-author-mode-shell");
const textAuthorModeSelect = document.getElementById("text-author-mode-select");
const editPostModal = document.getElementById("edit-post-modal");
const editPostBackdrop = document.getElementById("edit-post-backdrop");
const editPostForm = document.getElementById("edit-post-form");
const editPostFormTitle = document.getElementById("edit-post-form-title");
const editPostContext = document.getElementById("edit-post-context");
const editPostAliasShell = document.getElementById("edit-post-alias-shell");
const editPostAuthorModeSelect = document.getElementById("edit-post-author-mode-select");
const editPostFileName = document.getElementById("edit-post-file-name");
const editPostMediaNameShell = document.getElementById("edit-post-media-name-shell");
const editPostMediaNameInput = document.getElementById("edit-post-media-name-input");
const editPostTitleShell = document.getElementById("edit-post-title-shell");
const editPostTitleInput = document.getElementById("edit-post-title-input");
const editPostDescriptionShell = document.getElementById("edit-post-description-shell");
const editPostDescriptionLabel = document.getElementById("edit-post-description-label");
const editPostDescriptionInput = document.getElementById("edit-post-description-input");
const editPostBodyShell = document.getElementById("edit-post-body-shell");
const editPostBodyInput = document.getElementById("edit-post-body-input");
const editPostCloseButton = document.getElementById("edit-post-close-button");
const editPostCancelButton = document.getElementById("edit-post-cancel-button");
const editPostSaveButton = document.getElementById("edit-post-save-button");
const moveItemModal = document.getElementById("move-item-modal");
const moveItemBackdrop = document.getElementById("move-item-backdrop");
const moveItemForm = document.getElementById("move-item-form");
const moveItemTitle = document.getElementById("move-item-title");
const moveItemContext = document.getElementById("move-item-context");
const moveItemFolderSelect = document.getElementById("move-item-folder-select");
const moveItemCloseButton = document.getElementById("move-item-close-button");
const moveItemCancelButton = document.getElementById("move-item-cancel-button");
const moveItemSubmitButton = document.getElementById("move-item-submit-button");
const videoPreviewModal = document.getElementById("video-preview-modal");
const videoPreviewBackdrop = document.getElementById("video-preview-backdrop");
const videoPreviewCloseButton = document.getElementById("video-preview-close-button");
const videoPreviewShell = document.getElementById("video-preview-shell");
const videoPreviewTitle = document.getElementById("video-preview-title");
const videoPreviewBadge = document.getElementById("video-preview-badge");
const videoPreviewFrame = document.getElementById("video-preview-frame");
const videoPreviewPlayer = document.getElementById("video-preview-player");
const videoPreviewPrevButton = document.getElementById("video-preview-prev-button");
const videoPreviewNextButton = document.getElementById("video-preview-next-button");
const contributeModal = document.getElementById("contribute-modal");
const contributeBackdrop = document.getElementById("contribute-backdrop");
const contributeCloseButton = document.getElementById("contribute-close-button");
const contributeModalTitle = document.getElementById("contribute-modal-title");
const contributeModalContext = document.getElementById("contribute-modal-context");
const contributeModePicker = document.getElementById("contribute-mode-picker");
const textPreviewModal = document.getElementById("text-preview-modal");
const textPreviewBackdrop = document.getElementById("text-preview-backdrop");
const textPreviewCloseButton = document.getElementById("text-preview-close-button");
const textPreviewTitle = document.getElementById("text-preview-title");
const textPreviewContext = document.getElementById("text-preview-context");
const textPreviewBody = document.getElementById("text-preview-body");
const featuredMessageForm = document.getElementById("featured-message-form");
const featuredMessageFormTitle = document.getElementById("featured-message-form-title");
const featuredMessageInputLabel = document.getElementById("featured-message-input-label");
const featuredMessageInput = document.getElementById("featured-message-input");
const featuredMessageSubmit = document.getElementById("featured-message-submit");
const DEFAULT_PROFILE_IMAGE_URL = "/static/default-profile.svg";
const ROLE_FRIEND = "friend";
const ROLE_ADMIN = "admin";
const ROUTE_ARCHIVE = "archive";
const ROUTE_PROFILE_SELF = "profile-self";
const ROUTE_PROFILE_PUBLIC = "profile-public";
const ROUTE_UNKNOWN = "unknown";
const AUTHOR_ALIAS_BRAND = "brand";
const AUTHOR_ALIAS_SELF = "self";
const HIGHLIGHT_FOLDER_LABEL = String(STRINGS.brand || "100GIGZ").trim() || "100GIGZ";
const HIGHLIGHT_FOLDER_ID = slugifyFolder(HIGHLIGHT_FOLDER_LABEL);
const MAX_VIDEO_UPLOADS_PER_DAY = 10;
const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024;
const MAX_PROFILE_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const ITEM_SORT_MEDIA_DATE_DESC = "media-date-desc";
const ITEM_SORT_MEDIA_DATE_ASC = "media-date-asc";
const ITEM_SORT_RECENTLY_ADDED = "recently-added";
const FEATURED_MESSAGE_DOC_ID = "site-content";
const DEFAULT_FEATURED_MESSAGE = STRINGS.auth.loading;

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
let currentItemEdit = null;
let adminPanelsVisible = false;
let mobileMenuOpen = false;
let editPostModalOpen = false;
let moveItemModalOpen = false;
let videoPreviewModalOpen = false;
let contributeModalOpen = false;
let textPreviewModalOpen = false;
let currentVideoPreviewContext = null;
let currentItemMove = null;
let currentContributionContext = null;
let currentTextPreviewContext = null;
let profileSelectedFolders = new Map();
let currentRoute = normalizeRoute(window.location.pathname);
let featuredMessage = DEFAULT_FEATURED_MESSAGE;
let vaultState = {
  configured: false,
  unlocked: false,
  videoPath: "/assets/vault-intro.mp4",
  message: "",
};
let appInitializationPromise = null;
let appLoadingOverlayHideTimeout = 0;
let routeLoadingOverlayActive = false;
let vaultIntroPlaying = false;
let tripUnsubscribe = null;
let usersUnsubscribe = null;
let siteSettingsUnsubscribe = null;
const folderUnsubscribers = new Map();

applyStaticStrings();
renderFeaturedMessage();
startLogoGlitchLoop();
renderAll();
setupForms();
initializeVaultExperience().catch((error) => {
  const message = error instanceof Error ? error.message : STRINGS.errors.initFailed;
  setAppLoadingOverlayVisible(false);
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

  if (bannerSignOutButton) {
    bannerSignOutButton.textContent = STRINGS.auth.signOutButton;
  }

  if (desktopRouteToggleLink) {
    desktopRouteToggleLink.textContent = STRINGS.auth.profile;
  }

  if (bannerRouteToggleLink) {
    bannerRouteToggleLink.textContent = STRINGS.auth.profile;
  }

  if (adminPanelsToggleText) {
    adminPanelsToggleText.textContent = STRINGS.auth.showAdminPanels;
  }

  if (bannerAdminPanelsToggleText) {
    bannerAdminPanelsToggleText.textContent = STRINGS.auth.showAdminPanels;
  }

  if (bannerGoogleButton) {
    bannerGoogleButton.textContent = STRINGS.auth.signInButton;
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

  if (friendsMobileInlineTitle) {
    friendsMobileInlineTitle.textContent = STRINGS.members.panelTitle;
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

  if (editPostDescriptionLabel) {
    editPostDescriptionLabel.textContent = STRINGS.uploads.descriptionLabel;
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

  if (profilePageTitle) {
    profilePageTitle.textContent = STRINGS.profile.title;
  }

  if (profilePageSubtitle) {
    profilePageSubtitle.textContent = STRINGS.profile.subtitle;
  }

  if (profilePageHelper) {
    profilePageHelper.textContent = STRINGS.profile.helper;
  }

  if (profileCurrentImageLabel) {
    profileCurrentImageLabel.textContent = STRINGS.profile.currentImage;
  }

  if (profileImageSubmit) {
    profileImageSubmit.textContent = STRINGS.profile.uploadButton;
  }

  if (profileDetailsSubmit) {
    profileDetailsSubmit.textContent = STRINGS.profile.saveButton;
  }

  if (featuredMessageFormTitle) {
    featuredMessageFormTitle.textContent = STRINGS.admin.featuredMessageTitle;
  }

  if (featuredMessageInputLabel) {
    featuredMessageInputLabel.textContent = STRINGS.admin.featuredMessageLabel;
  }

  if (featuredMessageInput) {
    featuredMessageInput.placeholder = STRINGS.admin.featuredMessagePlaceholder;
  }

  if (featuredMessageSubmit) {
    featuredMessageSubmit.textContent = STRINGS.admin.featuredMessageSave;
  }
}

async function initializeVaultExperience() {
  applyVaultVideoSource(vaultState.videoPath);
  prepareVaultBackdrop();

  vaultState = await loadVaultStatus();
  applyVaultVideoSource(vaultState.videoPath);
  prepareVaultBackdrop();

  if (!vaultState.configured) {
    setAppLoadingOverlayVisible(false);
    lockSiteShell();
    showVaultGate();
    setVaultFormEnabled(false);
    setVaultFormVisible(true);
    setVaultStatusMessage(
      String(
        vaultState.message || STRINGS.errors.vaultPasswordMissingHosted
      ).toUpperCase(),
      true
    );
    return;
  }

  if (vaultState.unlocked) {
    lockSiteShell();
    hideVaultGateImmediately();
    setAppLoadingOverlayVisible(true);
    const [initResult] = await Promise.allSettled([initializeAppOnce()]);
    if (initResult.status === "rejected") {
      showWarning(getErrorMessage(initResult.reason, "Initialization failed."));
    }
    revealSiteShell();
    setAppLoadingOverlayVisible(false);
    return;
  }

  setAppLoadingOverlayVisible(false);
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
    subscribeToSiteSettings();
    subscribeToTrips();
    subscribeToFriends();
  } else {
    showWarning(STRINGS.errors.runtimeConfigMissing);
  }

  renderAll();
}

async function loadRuntimeConfig() {
  const response = await fetch("/api/config", {
    headers: { Accept: "application/json" },
  });
  const payload = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(
        payload,
        "Could not load runtime configuration from /api/config."
      )
    );
  }

  return payload;
}

async function loadVaultStatus() {
  const response = await fetch("/api/vault/status", {
    headers: { Accept: "application/json" },
  });
  const payload = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(payload, STRINGS.errors.vaultStatusFailed)
    );
  }

  return {
    configured: Boolean(payload?.configured),
    unlocked: Boolean(payload?.unlocked),
    videoPath: String(payload?.videoPath || "/assets/vault-intro.mp4"),
    message: String(payload?.message || ""),
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

function setAppLoadingOverlayVisible(visible) {
  if (!appLoadingOverlay) {
    return;
  }

  if (appLoadingOverlayHideTimeout) {
    window.clearTimeout(appLoadingOverlayHideTimeout);
    appLoadingOverlayHideTimeout = 0;
  }

  if (visible) {
    appLoadingOverlay.classList.remove("hidden", "pointer-events-none", "opacity-0");
    appLoadingOverlay.classList.add("flex", "opacity-100");
    return;
  }

  appLoadingOverlay.classList.add("pointer-events-none", "opacity-0");
  appLoadingOverlay.classList.remove("opacity-100");
  appLoadingOverlayHideTimeout = window.setTimeout(() => {
    appLoadingOverlay.classList.add("hidden");
    appLoadingOverlayHideTimeout = 0;
  }, 300);
}

function beginRouteLoadingOverlay() {
  routeLoadingOverlayActive = true;
  setAppLoadingOverlayVisible(true);
}

function finishRouteLoadingOverlayIfReady() {
  if (!routeLoadingOverlayActive || siteShell?.getAttribute("aria-hidden") === "true") {
    return;
  }

  const profileView = getActiveProfileView();

  if (profileView?.state === "loading") {
    return;
  }

  routeLoadingOverlayActive = false;
  setAppLoadingOverlayVisible(false);
}

function showVaultGate() {
  vaultGate?.classList.remove("hidden", "pointer-events-none", "opacity-0");
  vaultGate?.classList.add("opacity-100");
  document.body.classList.add("overflow-hidden");
}

function hideVaultGateImmediately() {
  if (!vaultGate) {
    return;
  }

  vaultGate.classList.add("hidden", "pointer-events-none", "opacity-0");
  vaultGate.classList.remove("opacity-100");
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
    setVaultStatusMessage(
      String(
        vaultState.message || STRINGS.errors.vaultPasswordMissingHosted
      ).toUpperCase(),
      true
    );
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
    const payload = await readJsonResponse(response);

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

async function readJsonResponse(response) {
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  const rawBody = await response.text();
  const trimmedBody = rawBody.trim();

  if (!trimmedBody) {
    return {};
  }

  if (!contentType.includes("application/json")) {
    if (
      trimmedBody.startsWith("<!DOCTYPE") ||
      trimmedBody.startsWith("<html") ||
      trimmedBody.startsWith("<HTML")
    ) {
      throw new Error(STRINGS.errors.apiReturnedHtml);
    }

    throw new Error(STRINGS.errors.apiReturnedInvalidJson);
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new Error(STRINGS.errors.apiReturnedInvalidJson);
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

function getApiErrorMessage(payload, fallbackMessage) {
  if (payload && typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  return fallbackMessage;
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

function subscribeToSiteSettings() {
  const siteSettingsRef = getSiteSettingsRef();

  if (!siteSettingsRef) {
    return;
  }

  siteSettingsUnsubscribe?.();
  siteSettingsUnsubscribe = onSnapshot(
    siteSettingsRef,
    (snapshot) => {
      const data = snapshot.exists() ? snapshot.data() : null;
      featuredMessage = normalizeFeaturedMessage(data?.featuredMessage);
      renderFeaturedMessage();
      syncFeaturedMessageForm();
    },
    () => {
      featuredMessage = DEFAULT_FEATURED_MESSAGE;
      renderFeaturedMessage();
      syncFeaturedMessageForm();
    }
  );
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
      } catch (error) {
        showWarning(getErrorMessage(error, STRINGS.errors.userSyncFailed));
      }
    } else {
      friendAccessIssue = false;
      resetTextPostEditor();
      resetContributeDialog();
      resetTextPreview();
      resetItemMoveDialog();
      adminPanelsVisible = false;
      setMobileMenuOpen(false);
      if (currentRoute?.kind === ROUTE_PROFILE_SELF) {
        navigateToRoute(ROUTE_ARCHIVE, { replace: true });
      }
    }

    syncDefaultAdminMode();
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
  featuredMessageForm?.addEventListener("submit", handleFeaturedMessageSubmit);
  tripForm?.addEventListener("submit", handleTripSubmit);
  folderForm?.addEventListener("submit", handleFolderSubmit);
  uploadForm?.addEventListener("submit", handleUploadSubmit);
  textPostForm?.addEventListener("submit", handleTextPostSubmit);
  editPostForm?.addEventListener("submit", handleEditTextPostSubmit);
  moveItemForm?.addEventListener("submit", handleMoveItemSubmit);
  profileImageForm?.addEventListener("submit", handleProfileImageSubmit);
  profileDetailsForm?.addEventListener("submit", handleProfileDetailsSubmit);
  editPostCloseButton?.addEventListener("click", resetTextPostEditor);
  editPostCancelButton?.addEventListener("click", resetTextPostEditor);
  editPostBackdrop?.addEventListener("click", resetTextPostEditor);
  moveItemCloseButton?.addEventListener("click", resetItemMoveDialog);
  moveItemCancelButton?.addEventListener("click", resetItemMoveDialog);
  moveItemBackdrop?.addEventListener("click", resetItemMoveDialog);
  videoPreviewCloseButton?.addEventListener("click", resetVideoPreview);
  videoPreviewBackdrop?.addEventListener("click", resetVideoPreview);
  videoPreviewPrevButton?.addEventListener("click", () => navigateVideoPreview(-1));
  videoPreviewNextButton?.addEventListener("click", () => navigateVideoPreview(1));
  contributeCloseButton?.addEventListener("click", resetContributeDialog);
  contributeBackdrop?.addEventListener("click", resetContributeDialog);
  contributeModal?.addEventListener("click", handleContributeModalClick);
  textPreviewCloseButton?.addEventListener("click", resetTextPreview);
  textPreviewBackdrop?.addEventListener("click", resetTextPreview);
  signOutButton?.addEventListener("click", handleSignOut);
  bannerSignOutButton?.addEventListener("click", handleSignOut);
  adminPanelsToggle?.addEventListener("change", handleAdminPanelsToggleChange);
  bannerAdminPanelsToggle?.addEventListener("change", handleAdminPanelsToggleChange);
  mobileMenuToggle?.addEventListener("click", handleMobileMenuToggleClick);
  mobileMenuBackdrop?.addEventListener("click", () => setMobileMenuOpen(false));
  desktopRouteToggleLink?.addEventListener("click", handleRouteToggleClick);
  bannerRouteToggleLink?.addEventListener("click", handleRouteToggleClick);
  bannerGoogleButton?.addEventListener("click", handleGoogleSignIn);
  uploadTripSelect?.addEventListener("change", renderAdminSelects);
  textTripSelect?.addEventListener("change", renderAdminSelects);
  uploadFilesInput?.addEventListener("change", handleUploadFilesSelectionChange);
  profileRouteInput?.addEventListener("input", handleProfileRouteInput);
  profileTripList?.addEventListener("click", handleProfileTripBrowserClick);
  profileTripList?.addEventListener("change", handleProfileTripBrowserChange);
  friendsDesktopList?.addEventListener("change", handleRoleSelectChange);
  friendsMobileList?.addEventListener("change", handleRoleSelectChange);
  friendsMobileInlineList?.addEventListener("change", handleRoleSelectChange);
  friendsDesktopList?.addEventListener("click", handleProfileActionClick);
  friendsMobileList?.addEventListener("click", handleProfileActionClick);
  friendsMobileInlineList?.addEventListener("click", handleProfileActionClick);
  document.addEventListener("click", handleDocumentRouteLinkClick);
  window.addEventListener("scroll", syncScrollBannerVisibility, { passive: true });
  window.addEventListener("resize", syncResponsivePanels);
  window.addEventListener("keydown", handleWindowKeydown);
  window.addEventListener("popstate", handleWindowPopstate);
  syncResponsivePanels();
  syncScrollBannerVisibility();
}

function handleAdminPanelsToggleChange(event) {
  setAdminPanelsVisible(Boolean(event.target?.checked));
}

function handleMobileMenuToggleClick() {
  setMobileMenuOpen(!mobileMenuOpen);
}

function handleWindowKeydown(event) {
  if (textPreviewModalOpen && event.key === "Escape") {
    resetTextPreview();
    return;
  }

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
    if (contributeModalOpen) {
      resetContributeDialog();
      return;
    }

    if (moveItemModalOpen) {
      resetItemMoveDialog();
      return;
    }

    if (editPostModalOpen) {
      resetTextPostEditor();
      return;
    }

    setMobileMenuOpen(false);
  }
}

function syncResponsivePanels() {
  const mobileViewport = window.innerWidth < 1280;
  const authTargetSlot = mobileViewport ? mobileAccessPanelSlot : desktopAccessPanelSlot;
  const targetSlot = mobileViewport ? mobileAdminPanelSlot : desktopControlPanelSlot;

  if (authPanel && authTargetSlot && authPanel.parentElement !== authTargetSlot) {
    authTargetSlot.appendChild(authPanel);
  }

  if (adminPanel && targetSlot && adminPanel.parentElement !== targetSlot) {
    targetSlot.appendChild(adminPanel);
  }

  if (!mobileViewport) {
    setMobileMenuOpen(false);
  }

  if (enforceSingleExpandedTripOnMobile()) {
    renderTrips();
  }

  syncScrollBannerVisibility();
}

function shouldShowScrollBanner() {
  if (!scrollBanner || !logo || siteShell?.getAttribute("aria-hidden") === "true") {
    return false;
  }

  const logoRect = logo.getBoundingClientRect();
  return window.scrollY > 0 && logoRect.bottom <= 0;
}

function moveMobileMenuToggle(targetSlot) {
  if (!mobileMenuToggle || !targetSlot || mobileMenuToggle.parentElement === targetSlot) {
    return;
  }

  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const firstRect = mobileMenuToggle.getBoundingClientRect();

  targetSlot.appendChild(mobileMenuToggle);

  if (prefersReducedMotion || !firstRect.width || !firstRect.height) {
    return;
  }

  const lastRect = mobileMenuToggle.getBoundingClientRect();
  const deltaX = firstRect.left - lastRect.left;
  const deltaY = firstRect.top - lastRect.top;

  if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
    return;
  }

  mobileMenuToggle.style.willChange = "transform";
  mobileMenuToggle.style.transition = "none";
  mobileMenuToggle.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
  mobileMenuToggle.getBoundingClientRect();

  requestAnimationFrame(() => {
    if (!mobileMenuToggle) {
      return;
    }

    mobileMenuToggle.style.transition = "";
    mobileMenuToggle.style.transform = "";
    mobileMenuToggle.addEventListener("transitionend", () => {
      mobileMenuToggle.style.willChange = "";
    }, { once: true });
  });
}

function syncMobileMenuPanelPosition() {
  if (!mobileMenuPanel || !mobileMenuToggle || window.innerWidth >= 1280) {
    if (mobileMenuPanel) {
      mobileMenuPanel.style.top = "";
      mobileMenuPanel.style.right = "";
      mobileMenuPanel.style.maxHeight = "";
    }

    return;
  }

  const toggleRect = mobileMenuToggle.getBoundingClientRect();
  const topOffset = Math.max(Math.round(toggleRect.bottom + 12), 72);
  const bottomGap = window.innerWidth >= 640 ? 24 : 16;
  const panelHeight = Math.max(window.innerHeight - topOffset - bottomGap, 220);

  mobileMenuPanel.style.top = `${topOffset}px`;
  mobileMenuPanel.style.maxHeight = `${panelHeight}px`;

  if (window.innerWidth >= 640) {
    mobileMenuPanel.style.right = `${Math.max(Math.round(window.innerWidth - toggleRect.right), 24)}px`;
  } else {
    mobileMenuPanel.style.right = "";
  }
}

function syncMobileMenuTogglePlacement(showScrollBanner = shouldShowScrollBanner()) {
  if (!mobileMenuToggle) {
    return;
  }

  const mobileViewport = window.innerWidth < 1280;
  const targetSlot = mobileViewport
    ? (showScrollBanner ? scrollBannerMobileMenuSlot : headerMobileMenuSlot)
    : headerMobileMenuSlot;

  mobileMenuToggle.classList.toggle("hidden", !mobileViewport);

  if (targetSlot) {
    moveMobileMenuToggle(targetSlot);
  }

  syncMobileMenuPanelPosition();
}

function syncScrollBannerVisibility() {
  const shouldShow = shouldShowScrollBanner();

  if (scrollBanner) {
    scrollBanner.classList.toggle("pointer-events-none", !shouldShow);
    scrollBanner.classList.toggle("opacity-0", !shouldShow);
    scrollBanner.classList.toggle("-translate-y-3", !shouldShow);
    scrollBanner.classList.toggle("opacity-100", shouldShow);
    scrollBanner.classList.toggle("translate-y-0", shouldShow);
  }

  syncMobileMenuTogglePlacement(shouldShow);
}

function getSettingsCollectionName() {
  return runtimeConfig?.collections?.settings || "settings";
}

function getSiteSettingsRef() {
  if (!db) {
    return null;
  }

  return doc(db, getSettingsCollectionName(), FEATURED_MESSAGE_DOC_ID);
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

  syncMobileMenuPanelPosition();
}

function handleWindowPopstate() {
  beginRouteLoadingOverlay();
  currentRoute = normalizeRoute(window.location.pathname);
  renderAll();
}

function handleRouteToggleClick() {
  beginRouteLoadingOverlay();
  navigateToRoute(isProfileRoute() ? ROUTE_ARCHIVE : getOwnProfileRoute());
}

function normalizeRoute(pathname) {
  const normalizedPath = String(pathname || "/")
    .split("?")[0]
    .replace(/\/+$/, "") || "/";
  const segment = normalizedPath === "/" ? "" : normalizedPath.slice(1);

  if (!segment) {
    return { kind: ROUTE_ARCHIVE };
  }

  if (segment.toLowerCase() === "profile") {
    return { kind: ROUTE_PROFILE_SELF };
  }

  if (isValidRouteId(segment.toUpperCase())) {
    return { kind: ROUTE_PROFILE_PUBLIC, routeId: segment.toUpperCase() };
  }

  return { kind: ROUTE_UNKNOWN, segment };
}

function navigateToRoute(route, options = {}) {
  const normalizedRoute = normalizeNextRoute(route);
  const targetPath = resolveRoutePath(normalizedRoute);

  if (window.location.pathname !== targetPath) {
    const method = options.replace ? "replaceState" : "pushState";
    window.history[method]({}, "", targetPath);
  }

  currentRoute = normalizedRoute;
  setMobileMenuOpen(false);
  renderAll();
}

function normalizeNextRoute(route) {
  if (!route || route === ROUTE_ARCHIVE || route?.kind === ROUTE_ARCHIVE) {
    return { kind: ROUTE_ARCHIVE };
  }

  if (route === ROUTE_PROFILE_SELF || route?.kind === ROUTE_PROFILE_SELF) {
    return { kind: ROUTE_PROFILE_SELF };
  }

  if (route === ROUTE_PROFILE_PUBLIC || route?.kind === ROUTE_PROFILE_PUBLIC) {
    const routeId = normalizeRouteId(route?.routeId || currentUserProfile?.routeId);
    return routeId
      ? { kind: ROUTE_PROFILE_PUBLIC, routeId }
      : { kind: ROUTE_PROFILE_SELF };
  }

  return normalizeRoute(resolveRoutePath(route));
}

function resolveRoutePath(route = currentRoute) {
  if (route?.kind === ROUTE_PROFILE_PUBLIC && route.routeId) {
    return buildProfilePath(route.routeId);
  }

  if (route?.kind === ROUTE_PROFILE_SELF) {
    return "/profile";
  }

  if (route?.kind === ROUTE_UNKNOWN && route.segment) {
    return `/${route.segment}`;
  }

  return "/";
}

function isProfileRoute(route = currentRoute) {
  return (
    route?.kind === ROUTE_PROFILE_SELF ||
    route?.kind === ROUTE_PROFILE_PUBLIC ||
    route?.kind === ROUTE_UNKNOWN
  );
}

function getOwnProfileRoute() {
  const routeId = normalizeRouteId(currentUserProfile?.routeId);
  return routeId
    ? { kind: ROUTE_PROFILE_PUBLIC, routeId }
    : { kind: ROUTE_PROFILE_SELF };
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

function setMoveItemModalOpen(nextOpen) {
  moveItemModalOpen = Boolean(nextOpen);

  if (moveItemModal) {
    moveItemModal.classList.toggle("hidden", !moveItemModalOpen);
    moveItemModal.classList.toggle("flex", moveItemModalOpen);
  }
}

function setContributeModalOpen(nextOpen) {
  contributeModalOpen = Boolean(nextOpen);

  if (contributeModal) {
    contributeModal.classList.toggle("hidden", !contributeModalOpen);
    contributeModal.classList.toggle("flex", contributeModalOpen);
  }

  syncUploadQueueVisibility();
}

function setTextPreviewModalOpen(nextOpen) {
  textPreviewModalOpen = Boolean(nextOpen);

  if (textPreviewModal) {
    textPreviewModal.classList.toggle("hidden", !textPreviewModalOpen);
    textPreviewModal.classList.toggle("flex", textPreviewModalOpen);
  }
}

function setContributeMode(mode = "") {
  const normalizedMode = mode === "upload" || mode === "text" ? mode : "";

  if (currentContributionContext) {
    currentContributionContext.mode = normalizedMode;
  }

  if (uploadForm) {
    uploadForm.classList.toggle("hidden", normalizedMode !== "upload");
  }

  if (textPostForm) {
    textPostForm.classList.toggle("hidden", normalizedMode !== "text");
  }

  syncUploadQueueVisibility();
}

function beginContribution(tripId, folderId) {
  if (!canUploadMedia()) {
    authDetail.textContent = STRINGS.uploads.signInRequired;
    return;
  }

  const trip = trips.find((entry) => entry.id === tripId);
  const folder = getFoldersForTrip(tripId).find((entry) => entry.id === folderId);

  if (!trip || !folder) {
    return;
  }

  currentContributionContext = { tripId, folderId, mode: "" };

  if (contributeModalTitle) {
    contributeModalTitle.textContent = "ADD TO FOLDER";
  }

  if (contributeModalContext) {
    contributeModalContext.textContent = buildFolderPathLabel(trip, folder);
  }

  uploadForm?.reset();
  textPostForm?.reset();
  renderUploadFileNameInputs();
  syncAuthorModeField(uploadAuthorModeSelect, uploadAuthorModeShell, AUTHOR_ALIAS_BRAND);
  syncAuthorModeField(textAuthorModeSelect, textAuthorModeShell, AUTHOR_ALIAS_BRAND);
  setContributeMode("");
  setContributeModalOpen(true);
}

function handleContributeModalClick(event) {
  const modeTrigger = event.target.closest("[data-action='set-contribute-mode']");

  if (modeTrigger) {
    setContributeMode(String(modeTrigger.getAttribute("data-mode") || ""));
    return;
  }

  if (event.target.closest("[data-action='show-contribute-menu']")) {
    setContributeMode("");
  }
}

function resetContributeDialog() {
  currentContributionContext = null;
  uploadForm?.reset();
  textPostForm?.reset();
  renderUploadFileNameInputs();
  setContributeMode("");
  setContributeModalOpen(false);
}

function renderUploadFileNameInputs() {
  if (!uploadFileNameListShell || !uploadFileNameList) {
    return;
  }

  const files = Array.from(uploadFilesInput?.files || []);

  uploadFileNameListShell.classList.toggle("hidden", files.length === 0);

  if (files.length === 0) {
    uploadFileNameList.innerHTML = "";
    return;
  }

  uploadFileNameList.innerHTML = files
    .map((file, index) => `
      <label class="block">
        <span class="mb-2 block font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.64rem] uppercase tracking-[0.18em] text-stone-400/72">File ${String(index + 1).padStart(2, "0")}</span>
        <input
          type="text"
          data-upload-file-name-index="${index}"
          maxlength="120"
          value="${escapeHtml(file.name)}"
          class="w-full border border-white/12 bg-black/40 px-3 py-3 text-sm tracking-[0.08em] text-stone-100 outline-none transition placeholder:text-stone-400/40 focus:border-white/35"
        >
      </label>
    `)
    .join("");
}

function getPendingUploadDisplayNames(files) {
  return files.map((file, index) => {
    const input = uploadFileNameList?.querySelector(`[data-upload-file-name-index="${index}"]`);
    return normalizeMediaDisplayName(input?.value, file.name);
  });
}

function openTextPreview(tripId, folderId, itemId) {
  const item = getItemsForFolder(tripId, folderId).find((entry) => entry.id === itemId);
  const trip = trips.find((entry) => entry.id === tripId);
  const folder = getFoldersForTrip(tripId).find((entry) => entry.id === folderId);

  if (!item || item.kind !== "text") {
    return;
  }

  currentTextPreviewContext = { tripId, folderId, itemId };

  if (textPreviewTitle) {
    textPreviewTitle.textContent = getItemDisplayName(item);
  }

  if (textPreviewContext) {
    textPreviewContext.textContent = buildFolderPathLabel(trip, folder);
  }

  if (textPreviewBody) {
    textPreviewBody.textContent = item.bodyText || "";
  }

  setTextPreviewModalOpen(true);
}

function resetTextPreview() {
  currentTextPreviewContext = null;

  if (textPreviewTitle) {
    textPreviewTitle.textContent = "";
  }

  if (textPreviewContext) {
    textPreviewContext.textContent = "";
  }

  if (textPreviewBody) {
    textPreviewBody.textContent = "";
  }

  setTextPreviewModalOpen(false);
}

function handleProfileRouteInput(event) {
  const target = event.target;

  if (!target) {
    return;
  }

  target.value = String(target.value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3);
}

function handleUploadFilesSelectionChange() {
  renderUploadFileNameInputs();
}

function handleDocumentRouteLinkClick(event) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  const anchor = event.target.closest("a[href]");

  if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) {
    return;
  }

  const href = String(anchor.getAttribute("href") || "").trim();

  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return;
  }

  let targetUrl = null;

  try {
    targetUrl = new URL(href, window.location.origin);
  } catch {
    return;
  }

  if (targetUrl.origin !== window.location.origin) {
    return;
  }

  const nextRoute = normalizeRoute(targetUrl.pathname);

  if (nextRoute.kind === ROUTE_UNKNOWN) {
    return;
  }

  event.preventDefault();
  beginRouteLoadingOverlay();
  window.requestAnimationFrame(() => {
    navigateToRoute(nextRoute);
  });
}

function handleProfileTripBrowserClick(event) {
  handleTripBrowserClick(event);
}

function handleProfileTripBrowserChange(event) {
  handleTripBrowserChange(event);
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

  if (bannerAdminPanelsControl) {
    bannerAdminPanelsControl.classList.toggle("hidden", !shouldShow);
    bannerAdminPanelsControl.classList.toggle("flex", shouldShow);
  }

  if (adminPanelsToggle) {
    adminPanelsToggle.checked = shouldShow && adminPanelsVisible;
  }

  if (bannerAdminPanelsToggle) {
    bannerAdminPanelsToggle.checked = shouldShow && adminPanelsVisible;
  }
}

function syncDefaultAdminMode() {
  if (isAdmin()) {
    adminPanelsVisible = true;
    if (adminPanelsToggle) {
      adminPanelsToggle.checked = true;
    }
    return;
  }

  adminPanelsVisible = false;
}

function setAdminPanelsVisible(visible) {
  const nextVisible = Boolean(visible && isAdmin());

  if (!nextVisible && currentTextPostEdit && !isCurrentUserTextOwner(currentTextPostEdit)) {
    resetTextPostEditor();
  }

  if (
    !nextVisible &&
    currentItemMove &&
    !canMoveItem(currentItemMove.item, currentItemMove.tripId, currentItemMove.folderId)
  ) {
    resetItemMoveDialog();
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

async function handleProfileImageSubmit(event) {
  event.preventDefault();

  if (!currentUser?.uid || !db || !storage || !storageReady) {
    authDetail.textContent = STRINGS.profile.signInRequired;
    return;
  }

  const file = profileImageInput?.files?.[0];

  if (!file) {
    return;
  }

  if (!isSupportedProfileImage(file)) {
    authDetail.textContent = STRINGS.firebase.profileImageType;
    return;
  }

  if (Number(file.size || 0) > MAX_PROFILE_IMAGE_SIZE_BYTES) {
    authDetail.textContent = STRINGS.firebase.profileImageSize;
    return;
  }

  const extension = getFileExtension(file.name) || "jpg";
  const storagePath = `profiles/${currentUser.uid}/profile-${buildUniqueStamp()}.${extension}`;
  const nextImageRef = storageRef(storage, storagePath);

  profileImageSubmit?.toggleAttribute("disabled", true);
  authDetail.textContent = STRINGS.profile.uploading;

  try {
    const task = uploadBytesResumable(nextImageRef, file, {
      contentType: file.type || "image/jpeg",
    });

    await new Promise((resolve, reject) => {
      task.on("state_changed", undefined, reject, resolve);
    });

    const downloadURL = await getDownloadURL(task.snapshot.ref);
    const previousPath = String(currentUserProfile?.photoStoragePath || "");

    await setDoc(
      doc(db, runtimeConfig.collections.users, currentUser.uid),
      {
        uid: currentUser.uid,
        email: currentUser.email || "",
        displayName: normalizeDisplayName(currentUserProfile?.displayName),
        googleName: normalizePersonName(
          currentUserProfile?.googleName ||
            currentUser.displayName ||
            inferNameFromEmail(currentUser.email)
        ),
        routeId: normalizeRouteId(currentUserProfile?.routeId),
        photoURL: downloadURL,
        photoStoragePath: storagePath,
        role: getCurrentUserRole(),
        isAdmin: isElevatedRole(getCurrentUserRole()),
        updatedAt: serverTimestamp(),
        updatedByUid: currentUser.uid,
        updatedByEmail: currentUser.email || "",
      },
      { merge: true }
    );

    if (previousPath && previousPath !== storagePath) {
      try {
        await deleteObject(storageRef(storage, previousPath));
      } catch (error) {
        if (!isStorageObjectMissing(error)) {
          throw error;
        }
      }
    }

    currentUserProfile = normalizeFriend({
      ...(currentUserProfile || {}),
      uid: currentUser.uid,
      email: currentUser.email || "",
      displayName: normalizeDisplayName(currentUserProfile?.displayName),
      googleName: normalizePersonName(
        currentUserProfile?.googleName ||
          currentUser.displayName ||
          inferNameFromEmail(currentUser.email)
      ),
      routeId: normalizeRouteId(currentUserProfile?.routeId),
      photoURL: downloadURL,
      photoStoragePath: storagePath,
      role: getCurrentUserRole(),
    });

    profileImageForm?.reset();
    authDetail.textContent = STRINGS.profile.uploadDone;
    renderAll();
  } catch (error) {
    authDetail.textContent = getFriendlyStorageMessage(error);
  } finally {
    profileImageSubmit?.toggleAttribute("disabled", false);
  }
}

function subscribeToTrips() {
  const tripsQuery = query(
    collection(db, runtimeConfig.collections.trips),
    orderBy("sortOrder", "desc")
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
      syncLegacyTripNumbers(snapshot.docs);
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
  if (!db || !runtimeConfig?.collections?.users) {
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

      void backfillVisibleProfiles(snapshot.docs);
      renderAll();
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
          selectedFolders.delete(trip.id);
          renderAll();
          await ensureTripFolders(trip);
          return;
        }

        foldersByTrip.set(trip.id, folders);

        const selectedFolderId = getSelectedFolderId(trip.id);
        if (!folders.some((folder) => folder.id === selectedFolderId)) {
          selectedFolders.set(trip.id, folders[0].id);
        }

        await loadAllFolderItemsForTrip(trip.id, folders);
        renderAll();
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
    const [, cachedTripId] = String(key).split(":");

    if (cachedTripId === tripId) {
      itemsByFolder.delete(key);
    }
  });
}

function pruneItemsForFolder(tripId, folderId) {
  [...itemsByFolder.keys()].forEach((key) => {
    const [, cachedTripId, cachedFolderId] = String(key).split(":");

    if (cachedTripId === tripId && cachedFolderId === folderId) {
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
        tripNumber: getTripSequenceNumber(trip),
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

  const folders = trip.folders && trip.folders.length > 0 ? trip.folders : [];
  const folderPromises = folders.map((folderSlug, index) => {
    const normalizedSlug = slugifyFolder(folderSlug);
    return setDoc(
      doc(
        db,
        runtimeConfig.collections.trips,
        trip.id,
        "folders",
        normalizedSlug
      ),
      {
        label: normalizedSlug,
        slug: normalizedSlug,
        kind: classifyFolderKind(normalizedSlug),
        sortOrder: index,
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

  try {
    await loadFolderItems(tripId, folderId);
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
  const displayName = hasOwnProperty(existingData, "displayName")
    ? normalizeDisplayName(existingData?.displayName)
    : "";
  const googleName = normalizePersonName(
    existingData?.googleName || user.displayName || inferNameFromEmail(user.email)
  );
  const routeId =
    normalizeRouteId(existingData?.routeId) ||
    (await ensureUniqueRouteId("", user.uid));
  const payload = {
    uid: user.uid,
    email: user.email || "",
    displayName,
    googleName,
    routeId,
    photoURL: String(existingData?.photoStoragePath ? existingData?.photoURL || "" : ""),
    photoStoragePath: String(existingData?.photoStoragePath || ""),
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
    displayName,
    googleName,
    routeId,
    photoURL: String(existingData?.photoStoragePath ? existingData?.photoURL || "" : ""),
    photoStoragePath: String(existingData?.photoStoragePath || ""),
    role,
  });
}

async function handleProfileDetailsSubmit(event) {
  event.preventDefault();

  if (!db || !currentUser?.uid || !currentUserProfile) {
    authDetail.textContent = STRINGS.profile.signInRequired;
    return;
  }

  const nextDisplayName = normalizeDisplayName(profileDisplayNameInput?.value);
  const requestedRouteId = normalizeRouteId(profileRouteInput?.value);

  if (!isValidRouteId(requestedRouteId)) {
    authDetail.textContent = STRINGS.profile.routeInvalid;
    return;
  }

  const routeId = await ensureUniqueRouteId(requestedRouteId, currentUser.uid);

  if (routeId !== requestedRouteId) {
    authDetail.textContent = STRINGS.profile.routeTaken;
    return;
  }

  profileDetailsSubmit?.toggleAttribute("disabled", true);

  try {
    await setDoc(
      doc(db, runtimeConfig.collections.users, currentUser.uid),
      {
        uid: currentUser.uid,
        email: currentUser.email || "",
        displayName: nextDisplayName,
        googleName: normalizePersonName(
          currentUserProfile.googleName ||
            currentUser.displayName ||
            inferNameFromEmail(currentUser.email)
        ),
        routeId,
        photoURL: currentUserProfile.photoURL || "",
        photoStoragePath: currentUserProfile.photoStoragePath || "",
        role: getCurrentUserRole(),
        isAdmin: isElevatedRole(getCurrentUserRole()),
        updatedAt: serverTimestamp(),
        updatedByUid: currentUser.uid,
        updatedByEmail: currentUser.email || "",
      },
      { merge: true }
    );

    currentUserProfile = normalizeFriend({
      ...currentUserProfile,
      uid: currentUser.uid,
      email: currentUser.email || "",
      displayName: nextDisplayName,
      googleName: normalizePersonName(
        currentUserProfile.googleName ||
          currentUser.displayName ||
          inferNameFromEmail(currentUser.email)
      ),
      routeId,
    });

    authDetail.textContent = STRINGS.profile.saveDone;

    window.setTimeout(() => {
      const targetPath = buildProfilePath(routeId);
      setAppLoadingOverlayVisible(true);

      if (window.location.pathname === targetPath) {
        window.location.reload();
        return;
      }

      window.location.replace(targetPath);
    }, 140);
  } catch (error) {
    authDetail.textContent = getErrorMessage(error, STRINGS.profile.saveFailed);
    profileDetailsSubmit?.toggleAttribute("disabled", false);
  }
}

async function ensureUniqueRouteId(preferredRouteId = "", excludeUid = "") {
  const normalizedPreferredRouteId = normalizeRouteId(preferredRouteId);

  if (
    normalizedPreferredRouteId &&
    !(await isRouteIdTaken(normalizedPreferredRouteId, excludeUid))
  ) {
    return normalizedPreferredRouteId;
  }

  const reservedRouteIds = new Set(
    friends
      .filter((friend) => friend.uid !== excludeUid)
      .map((friend) => normalizeRouteId(friend.routeId))
      .filter(Boolean)
  );

  for (let attempt = 0; attempt < 200; attempt += 1) {
    const nextRouteId = generateRandomRouteId();

    if (reservedRouteIds.has(nextRouteId)) {
      continue;
    }

    if (!(await isRouteIdTaken(nextRouteId, excludeUid))) {
      return nextRouteId;
    }
  }

  throw new Error("Could not generate a unique route ID.");
}

async function isRouteIdTaken(routeId, excludeUid = "") {
  if (!db || !runtimeConfig?.collections?.users || !isValidRouteId(routeId)) {
    return false;
  }

  const routeSnapshot = await getDocs(
    query(
      collection(db, runtimeConfig.collections.users),
      where("routeId", "==", normalizeRouteId(routeId))
    )
  );

  return routeSnapshot.docs.some((userDoc) => userDoc.id !== excludeUid);
}

function generateRandomRouteId() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let routeId = "";

  for (let index = 0; index < 3; index += 1) {
    routeId += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }

  return routeId;
}

async function backfillVisibleProfiles(userDocs) {
  if (!db || !currentUser?.uid || !isAdmin()) {
    return;
  }

  const existingRouteIds = new Set(
    userDocs
      .map((userDoc) => normalizeRouteId(userDoc.data()?.routeId))
      .filter(Boolean)
  );
  const batch = writeBatch(db);
  let pendingWrites = 0;

  for (const userDoc of userDocs) {
    const data = userDoc.data() || {};
    const updates = {};

    if (!hasOwnProperty(data, "displayName")) {
      updates.displayName = "";
    }

    if (!normalizePersonName(data.googleName)) {
      updates.googleName = normalizePersonName(
        data.displayName || inferNameFromEmail(data.email)
      );
    }

    if (!normalizeRouteId(data.routeId)) {
      let nextRouteId = "";

      do {
        nextRouteId = generateRandomRouteId();
      } while (existingRouteIds.has(nextRouteId));

      existingRouteIds.add(nextRouteId);
      updates.routeId = nextRouteId;
    }

    if (Object.keys(updates).length > 0) {
      batch.set(userDoc.ref, updates, { merge: true });
      pendingWrites += 1;
    }
  }

  if (pendingWrites > 0) {
    await batch.commit();
  }
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
      tripNumber: getNextTripNumber(),
      sortOrder: getNextTripSortOrder(),
      subtitle: `${slug.toUpperCase()} / FILE SYSTEM READY`,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdByUid: currentUser?.uid || "",
    });

    await ensureTripFolders({
      id: slug,
      slug,
      folders: folderSeeds,
    });

    event.currentTarget.reset();
  } catch (error) {
    authDetail.textContent = getErrorMessage(error, STRINGS.errors.tripCreateFailed);
  }
}

async function handleFeaturedMessageSubmit(event) {
  event.preventDefault();

  if (!db || !isAdminViewEnabled()) {
    return;
  }

  const siteSettingsRef = getSiteSettingsRef();

  if (!siteSettingsRef) {
    return;
  }

  const formData = new FormData(event.currentTarget);
  const nextMessage = normalizeFeaturedMessage(formData.get("featuredMessage"));

  featuredMessageSubmit?.toggleAttribute("disabled", true);

  try {
    await setDoc(
      siteSettingsRef,
      {
        featuredMessage: nextMessage,
        updatedAt: serverTimestamp(),
        updatedByUid: currentUser?.uid || "",
        updatedByEmail: currentUser?.email || "",
      },
      { merge: true }
    );

    featuredMessage = nextMessage;
    renderFeaturedMessage();
    syncFeaturedMessageForm();
    authDetail.textContent = STRINGS.admin.featuredMessageSaved;
  } catch (error) {
    authDetail.textContent = getErrorMessage(
      error,
      STRINGS.errors.featuredMessageFailed
    );
  } finally {
    featuredMessageSubmit?.toggleAttribute("disabled", false);
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

  if (!trip || !folderSlug) {
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
  const tripId = String(currentContributionContext?.tripId || "");
  const folderId = String(currentContributionContext?.folderId || "");
  const files = Array.from(uploadFilesInput?.files || []);
  const description = String(formData.get("description") || "").trim();
  const trip = trips.find((item) => item.id === tripId);
  const folder = getFoldersForTrip(tripId).find((item) => item.id === folderId);
  const authorMode = getSelectedAuthorMode(uploadAuthorModeSelect);
  const displayNames = getPendingUploadDisplayNames(files);

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
  if (oversizedVideo && !isAdmin()) {
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
    uploadMediaFile(trip, folder, file, index, description, authorMode, displayNames[index])
  );

  const results = await Promise.allSettled(uploadPromises);
  const successCount = results.filter((result) => result.status === "fulfilled").length;
  const failureCount = results.length - successCount;

  authDetail.textContent = STRINGS.uploads.summary(successCount, failureCount);

  event.currentTarget.reset();
  resetContributeDialog();
  await loadSelectedFolderItems(tripId);
}

async function uploadMediaFile(trip, folder, file, index, description = "", authorMode, displayName = "") {
  const resolvedDisplayName = normalizeMediaDisplayName(displayName, file.name);
  const generatedName = buildStorageFileName(file, index, resolvedDisplayName);
  const ownerUid = String(currentUser?.uid || "member");
  const storagePath = `trips/${trip.slug}/${folder.slug}/${ownerUid}/${generatedName}`;
  const ref = storageRef(storage, storagePath);
  const jobId = `${Date.now()}-${index}-${generatedName}`;
  const authorship = buildAuthorshipFields(authorMode);

  pushUploadJob({
    id: jobId,
    name: resolvedDisplayName || generatedName,
    status: "uploading",
    progress: 0,
  });

  const task = uploadBytesResumable(ref, file, {
    contentType: file.type || "application/octet-stream",
    customMetadata: {
      createdByUid: String(currentUser?.uid || ""),
      createdByEmail: String(currentUser?.email || ""),
      tripId: String(trip.id || ""),
      folderId: String(folder.id || ""),
    },
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
        customMetadata: {
          createdByUid: String(currentUser?.uid || ""),
          createdByEmail: String(currentUser?.email || ""),
          tripId: String(trip.id || ""),
          folderId: String(folder.id || ""),
        },
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
    originalName: resolvedDisplayName || file.name,
    description,
    certified: false,
    mediaDateMs: Number(file.lastModified || 0),
    mimeType: file.type || "application/octet-stream",
    extension: getFileExtension(generatedName),
    size: file.size,
    downloadURL,
    storagePath,
    posterDownloadURL,
    posterStoragePath,
    authorLabel: authorship.authorLabel,
    authorUid: authorship.authorUid,
    authorRouteId: authorship.authorRouteId,
    authorAliasMode: authorship.authorAliasMode,
    authorDisplayName: authorship.authorDisplayName,
    authorGoogleName: authorship.authorGoogleName,
    tripId: trip.id,
    folderId: folder.id,
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

function isSupportedProfileImage(file) {
  return isImageFile(file) && ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(String(file?.type || "").toLowerCase());
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

function canChooseBrandAlias() {
  return isAdmin();
}

function canChooseBrandAliasForItem(item = null) {
  if (!canChooseBrandAlias()) {
    return false;
  }

  if (!item) {
    return true;
  }

  return (
    isItemBrandAuthored(item) ||
    item.createdByUid === currentUser?.uid ||
    getItemAuthorUid(item) === currentUser?.uid
  );
}

function syncAuthorModeField(selectElement, shellElement, selectedMode = AUTHOR_ALIAS_SELF) {
  if (!selectElement || !shellElement) {
    return;
  }

  const shouldShow = canChooseBrandAlias();
  shellElement.classList.toggle("hidden", !shouldShow);

  if (!shouldShow) {
    selectElement.innerHTML = "";
    return;
  }

  const selfLabel = getFriendLabel(
    currentUserProfile ||
      normalizeFriend({
        uid: currentUser?.uid || "",
        email: currentUser?.email || "",
        googleName: currentUser?.displayName || "",
        displayName: currentUserProfile?.displayName || "",
      })
  );

  selectElement.innerHTML = `
    <option value="${AUTHOR_ALIAS_BRAND}">${escapeHtml(STRINGS.uploads.aliasBrand)}</option>
    <option value="${AUTHOR_ALIAS_SELF}">${escapeHtml(selfLabel || STRINGS.uploads.aliasSelf)}</option>
  `;
  selectElement.value =
    selectedMode === AUTHOR_ALIAS_BRAND ? AUTHOR_ALIAS_BRAND : AUTHOR_ALIAS_SELF;
}

function getSelectedAuthorMode(selectElement) {
  if (!canChooseBrandAlias()) {
    return AUTHOR_ALIAS_SELF;
  }

  return selectElement?.value === AUTHOR_ALIAS_BRAND
    ? AUTHOR_ALIAS_BRAND
    : AUTHOR_ALIAS_SELF;
}

function buildAuthorshipFields(mode = AUTHOR_ALIAS_SELF) {
  if (mode === AUTHOR_ALIAS_BRAND && canChooseBrandAlias()) {
    return {
      authorLabel: STRINGS.brand,
      authorUid: "",
      authorRouteId: "",
      authorAliasMode: AUTHOR_ALIAS_BRAND,
      authorDisplayName: "",
      authorGoogleName: "",
    };
  }

  const profile = currentUserProfile ||
    normalizeFriend({
      uid: currentUser?.uid || "",
      email: currentUser?.email || "",
      displayName: "",
      googleName: currentUser?.displayName || inferNameFromEmail(currentUser?.email),
      routeId: currentUserProfile?.routeId || "",
    });

  return {
    authorLabel: getFriendLabel(profile),
    authorUid: String(profile.uid || currentUser?.uid || ""),
    authorRouteId: normalizeRouteId(profile.routeId),
    authorAliasMode: AUTHOR_ALIAS_SELF,
    authorDisplayName: normalizeDisplayName(profile.displayName),
    authorGoogleName: getFriendGoogleName(profile),
  };
}

function isBrandAuthorLabel(label) {
  return String(label || "").trim().toUpperCase() === String(STRINGS.brand || "").trim().toUpperCase();
}

function getItemAuthorUid(item) {
  if (item?.authorUid) {
    return String(item.authorUid);
  }

  if (isItemBrandAuthored(item)) {
    return "";
  }

  return String(item?.createdByUid || item?.uploadedByUid || "");
}

function isItemBrandAuthored(item) {
  return (
    item?.authorAliasMode === AUTHOR_ALIAS_BRAND ||
    (!item?.authorUid && !item?.authorRouteId && isBrandAuthorLabel(item?.authorLabel))
  );
}

function getItemAuthorRouteId(item) {
  if (item?.authorRouteId) {
    return normalizeRouteId(item.authorRouteId);
  }

  const friend = getFriendByUid(getItemAuthorUid(item));
  return normalizeRouteId(friend?.routeId);
}

function resolveItemAuthorFriend(item) {
  if (isItemBrandAuthored(item)) {
    return null;
  }

  return getFriendByUid(getItemAuthorUid(item));
}

function isItemAuthoredByUser(item, friend) {
  if (!friend?.uid || isItemBrandAuthored(item)) {
    return false;
  }

  const authorUid = getItemAuthorUid(item);
  if (authorUid) {
    return authorUid === friend.uid;
  }

  return (
    item?.createdByUid === friend.uid ||
    item?.uploadedByUid === friend.uid
  );
}

function getFriendPhotoUrl(friend) {
  const url = String(friend?.photoURL || "").trim();
  return url || DEFAULT_PROFILE_IMAGE_URL;
}

function resolveItemAuthorLabel(item) {
  if (item.authorLabel) {
    return item.authorLabel;
  }

  if (isItemBrandAuthored(item) || isAdminEmail(item.createdByEmail)) {
    return STRINGS.brand;
  }

  if (item.authorUid) {
    const authorFriend = getFriendByUid(item.authorUid);
    return (
      (authorFriend ? getFriendLabel(authorFriend) : "") ||
      normalizeDisplayName(item.authorDisplayName) ||
      normalizePersonName(item.authorGoogleName)
    );
  }

  return inferNameFromEmail(item.createdByEmail) || item.createdByUid || "";
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
  const tripId = String(currentContributionContext?.tripId || "");
  const folderId = String(currentContributionContext?.folderId || "");
  const title = sanitizeUpper(formData.get("title"));
  const body = String(formData.get("body") || "").trim();
  const authorship = buildAuthorshipFields(getSelectedAuthorMode(textAuthorModeSelect));

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
      certified: false,
      authorLabel: authorship.authorLabel,
      authorUid: authorship.authorUid,
      authorRouteId: authorship.authorRouteId,
      authorAliasMode: authorship.authorAliasMode,
      authorDisplayName: authorship.authorDisplayName,
      authorGoogleName: authorship.authorGoogleName,
      tripId,
      folderId,
      createdAt: serverTimestamp(),
      createdAtMs: Date.now(),
      createdByUid: currentUser?.uid || "",
      createdByEmail: currentUser?.email || "",
    });

    event.currentTarget.reset();
    resetContributeDialog();
    await loadSelectedFolderItems(tripId);
  } catch (error) {
    authDetail.textContent = getErrorMessage(error, STRINGS.errors.textPostFailed);
  }
}

async function handleEditTextPostSubmit(event) {
  event.preventDefault();

  if (!db || !currentItemEdit) {
    return;
  }

  const formData = new FormData(event.currentTarget);
  const isTextItem = currentItemEdit.kind === "text";
  const title = sanitizeUpper(formData.get("title"));
  const body = String(formData.get("body") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const mediaName = normalizeMediaDisplayName(
    formData.get("mediaName"),
    currentItemEdit.item?.originalName || getItemDisplayName(currentItemEdit.item)
  );
  const updates = {
    updatedAt: serverTimestamp(),
    updatedByUid: currentUser?.uid || "",
    updatedByEmail: currentUser?.email || "",
  };

  if (isTextItem) {
    if (!title || !body) {
      return;
    }

    Object.assign(updates, {
      kind: "text",
      title,
      body,
      name: `${slugifyFolder(title)}.txt`,
      mimeType: "text/plain",
    });
  } else {
    Object.assign(updates, {
      kind: "file",
      description,
      originalName: mediaName,
    });
  }

  if (canChooseBrandAliasForItem(currentItemEdit.item)) {
    Object.assign(updates, buildAuthorshipFields(getSelectedAuthorMode(editPostAuthorModeSelect)));
  }

  try {
    await setDoc(
      doc(
        db,
        runtimeConfig.collections.trips,
        currentItemEdit.tripId,
        "folders",
        currentItemEdit.folderId,
        "items",
        currentItemEdit.itemId
      ),
      updates,
      { merge: true }
    );

    const tripId = currentItemEdit.tripId;
    const folderId = currentItemEdit.folderId;
    resetTextPostEditor();
    await loadFolderItems(tripId, folderId);
    renderAll();
  } catch (error) {
    authDetail.textContent = getErrorMessage(error, STRINGS.errors.textPostFailed);
  }
}

function beginItemEdit(tripId, folderId, item) {
  if (!item || !canEditItem(item)) {
    return;
  }

  currentItemEdit = {
    tripId,
    folderId,
    itemId: item.id,
    kind: item.kind,
    item,
  };
  currentTextPostEdit = currentItemEdit;

  const trip = trips.find((entry) => entry.id === tripId);
  const folder = getFoldersForTrip(tripId).find((entry) => entry.id === folderId);
  const isTextItem = item.kind === "text";
  const canPickAlias = canChooseBrandAliasForItem(item);

  if (editPostTitleInput) {
    editPostTitleInput.value = item.title || item.name || "";
  }

  if (editPostDescriptionInput) {
    editPostDescriptionInput.value = item.description || "";
  }

  if (editPostMediaNameInput) {
    editPostMediaNameInput.value = item.originalName || getItemDisplayName(item);
  }

  if (editPostBodyInput) {
    editPostBodyInput.value = item.bodyText || "";
  }

  if (editPostFormTitle) {
    editPostFormTitle.textContent = isTextItem ? STRINGS.admin.editTextPostTitle : "Edit Media";
  }

  if (editPostContext) {
    editPostContext.textContent = buildFolderPathLabel(trip, folder);
  }

  if (editPostFileName) {
    editPostFileName.textContent = isTextItem
      ? ""
      : `FILE // ${getItemDisplayName(item)}`;
    editPostFileName.classList.toggle("hidden", isTextItem);
  }

  editPostTitleShell?.classList.toggle("hidden", !isTextItem);
  editPostBodyShell?.classList.toggle("hidden", !isTextItem);
  editPostDescriptionShell?.classList.toggle("hidden", isTextItem);
  editPostMediaNameShell?.classList.toggle("hidden", isTextItem);

  if (editPostTitleInput) {
    editPostTitleInput.required = isTextItem;
  }

  if (editPostBodyInput) {
    editPostBodyInput.required = isTextItem;
  }

  if (editPostMediaNameInput) {
    editPostMediaNameInput.required = !isTextItem;
  }

  if (editPostAliasShell) {
    syncAuthorModeField(
      editPostAuthorModeSelect,
      editPostAliasShell,
      isItemBrandAuthored(item) ? AUTHOR_ALIAS_BRAND : AUTHOR_ALIAS_SELF
    );
    editPostAliasShell.classList.toggle("hidden", !canPickAlias);
  }

  setEditPostModalOpen(true);
  window.requestAnimationFrame(() => {
    if (isTextItem) {
      editPostTitleInput?.focus();
      editPostTitleInput?.select();
      return;
    }

    editPostMediaNameInput?.focus();
    editPostMediaNameInput?.select();
  });
}

function resetTextPostEditor() {
  currentItemEdit = null;
  currentTextPostEdit = null;
  editPostForm?.reset();

  if (editPostContext) {
    editPostContext.textContent = "";
  }

  if (editPostFileName) {
    editPostFileName.textContent = "";
    editPostFileName.classList.add("hidden");
  }

  if (editPostMediaNameInput) {
    editPostMediaNameInput.value = "";
  }

  editPostTitleShell?.classList.remove("hidden");
  editPostBodyShell?.classList.remove("hidden");
  editPostDescriptionShell?.classList.add("hidden");
  editPostMediaNameShell?.classList.add("hidden");
  editPostAliasShell?.classList.add("hidden");

  setEditPostModalOpen(false);
}

function beginItemMove(tripId, folderId, item) {
  if (!tripId || !folderId || !item || !canMoveItem(item, tripId, folderId)) {
    return;
  }

  const trip = trips.find((entry) => entry.id === tripId);
  const currentFolder = getFoldersForTrip(tripId).find((entry) => entry.id === folderId);
  const destinationFolders = getFoldersForTrip(tripId).filter(
    (entry) => entry.id !== folderId && !isHighlightFolder(entry)
  );

  if (!trip || !currentFolder || destinationFolders.length === 0) {
    return;
  }

  currentItemMove = {
    tripId,
    folderId,
    itemId: item.id,
    item,
  };

  if (moveItemTitle) {
    moveItemTitle.textContent = getItemDisplayName(item);
  }

  if (moveItemContext) {
    moveItemContext.textContent = `MOVE FROM ${buildFolderPathLabel(trip, currentFolder)}`;
  }

  if (moveItemFolderSelect) {
    moveItemFolderSelect.innerHTML = destinationFolders
      .map(
        (folder) =>
          `<option value="${escapeHtml(folder.id)}">${escapeHtml(
            buildFolderSelectLabel(tripId, folder)
          )}</option>`
      )
      .join("");
    moveItemFolderSelect.value = destinationFolders[0]?.id || "";
  }

  setMoveItemModalOpen(true);
  window.requestAnimationFrame(() => {
    moveItemFolderSelect?.focus();
  });
}

function resetItemMoveDialog() {
  currentItemMove = null;
  moveItemForm?.reset();

  if (moveItemTitle) {
    moveItemTitle.textContent = "";
  }

  if (moveItemContext) {
    moveItemContext.textContent = "";
  }

  if (moveItemFolderSelect) {
    moveItemFolderSelect.innerHTML = "";
  }

  if (moveItemSubmitButton) {
    moveItemSubmitButton.disabled = false;
  }

  setMoveItemModalOpen(false);
}

async function handleMoveItemSubmit(event) {
  event.preventDefault();

  if (!db || !currentItemMove || !moveItemFolderSelect) {
    return;
  }

  const { tripId, folderId, itemId } = currentItemMove;
  const destinationFolderId = String(moveItemFolderSelect.value || "");
  const destinationFolder = getFoldersForTrip(tripId).find(
    (entry) => entry.id === destinationFolderId
  );

  if (!destinationFolderId || !destinationFolder || destinationFolderId === folderId) {
    return;
  }

  const sourceRef = doc(
    db,
    runtimeConfig.collections.trips,
    tripId,
    "folders",
    folderId,
    "items",
    itemId
  );
  const destinationRef = doc(
    db,
    runtimeConfig.collections.trips,
    tripId,
    "folders",
    destinationFolderId,
    "items",
    itemId
  );

  moveItemSubmitButton?.toggleAttribute("disabled", true);

  try {
    const sourceSnapshot = await getDoc(sourceRef);

    if (!sourceSnapshot.exists()) {
      throw new Error("This item no longer exists.");
    }

    const sourceItem = normalizeItem({ id: sourceSnapshot.id, ...sourceSnapshot.data() });

    if (!canMoveItem(sourceItem, tripId, folderId)) {
      throw new Error("You do not have permission to move this item.");
    }

    const batch = writeBatch(db);
    batch.set(destinationRef, {
      ...sourceSnapshot.data(),
      folderId: destinationFolderId,
      updatedAt: serverTimestamp(),
      updatedByUid: currentUser?.uid || "",
      updatedByEmail: currentUser?.email || "",
      movedAt: serverTimestamp(),
      movedByUid: currentUser?.uid || "",
      movedByEmail: currentUser?.email || "",
    });
    batch.delete(sourceRef);
    await batch.commit();

    if (
      currentTextPostEdit?.tripId === tripId &&
      currentTextPostEdit.folderId === folderId &&
      currentTextPostEdit.itemId === itemId
    ) {
      resetTextPostEditor();
    }

    if (
      currentVideoPreviewContext?.tripId === tripId &&
      currentVideoPreviewContext.folderId === folderId &&
      currentVideoPreviewContext.itemId === itemId
    ) {
      resetVideoPreview();
    }

    const movedItemName = getItemDisplayName(sourceItem);
    resetItemMoveDialog();
    await Promise.all([
      loadFolderItems(tripId, folderId),
      loadFolderItems(tripId, destinationFolderId),
    ]);
    renderAll();
    authDetail.textContent = `MOVED ${movedItemName.toUpperCase()} TO ${destinationFolder.slug.toUpperCase()}/`;
  } catch (error) {
    authDetail.textContent = getErrorMessage(error, "Could not move item.");
    moveItemSubmitButton?.toggleAttribute("disabled", false);
  }
}

function openVideoPreview(tripId, folderId, itemId, view = "archive") {
  if (!videoPreviewPlayer || !tripId || !folderId || !itemId) {
    return;
  }

  currentVideoPreviewContext = { tripId, folderId, itemId, view };
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

  openVideoPreview(previewState.tripId, previewState.folderId, nextItem.id, previewState.view);
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

  const { tripId, folderId, itemId, view } = currentVideoPreviewContext;
  const items = getFolderVideoItems(tripId, folderId, view);
  const currentIndex = items.findIndex((item) => item.id === itemId);

  if (currentIndex === -1) {
    return null;
  }

  return {
    tripId,
    folderId,
    itemId,
    view,
    items,
    currentIndex,
    currentItem: items[currentIndex],
  };
}

function getFolderVideoItems(tripId, folderId, view = "archive") {
  const profileView = getActiveProfileView();
  const items = view === "profile" && profileView?.friend
    ? getProfileItemsForFolder(
        profileView.friend,
        tripId,
        folderId,
        getItemSortMode(tripId, folderId, view)
      )
    : getSortedItemsForFolder(tripId, folderId, getItemSortMode(tripId, folderId, view));

  return items.filter((item) => item.kind === "file" && item.mimeType.startsWith("video/"));
}

function syncVideoPreviewNavigation(previewState = getCurrentVideoPreviewState()) {
  if (videoPreviewTitle) {
    videoPreviewTitle.textContent = previewState
      ? `CLIP PREVIEW // ${getItemDisplayName(previewState.currentItem)} // ${previewState.currentIndex + 1}/${previewState.items.length}`
      : "";
  }

  syncVideoPreviewCertification(previewState);

  if (videoPreviewPrevButton) {
    videoPreviewPrevButton.disabled = !previewState || previewState.currentIndex === 0;
  }

  if (videoPreviewNextButton) {
    videoPreviewNextButton.disabled =
      !previewState || previewState.currentIndex >= previewState.items.length - 1;
  }
}

function syncVideoPreviewCertification(previewState = getCurrentVideoPreviewState()) {
  const certified = Boolean(previewState?.currentItem && isItemCertified(previewState.currentItem));

  if (videoPreviewBadge) {
    videoPreviewBadge.textContent = certified ? HIGHLIGHT_FOLDER_LABEL : "";
    videoPreviewBadge.classList.toggle("hidden", !certified);

    if (certified) {
      videoPreviewBadge.setAttribute("style", getHighlightTextStyle());
    } else {
      videoPreviewBadge.removeAttribute("style");
    }
  }

  if (videoPreviewShell) {
    if (certified) {
      videoPreviewShell.classList.remove("border-white/12");
      videoPreviewShell.classList.add("border-amber-300/28");
      videoPreviewShell.style.boxShadow =
        "0 24px 96px rgba(0,0,0,0.62),0 0 28px rgba(255,191,31,0.06)";
    } else {
      videoPreviewShell.classList.remove("border-amber-300/28");
      videoPreviewShell.classList.add("border-white/12");
      videoPreviewShell.style.boxShadow = "";
    }
  }

  if (videoPreviewFrame) {
    if (certified) {
      videoPreviewFrame.classList.remove("border-white/12", "bg-black/70");
      videoPreviewFrame.classList.add("border-amber-300/32", "bg-[rgba(32,22,6,0.62)]");
    } else {
      videoPreviewFrame.classList.remove("border-amber-300/32", "bg-[rgba(32,22,6,0.62)]");
      videoPreviewFrame.classList.add("border-white/12", "bg-black/70");
    }
  }
}

function isCurrentUserItemOwner(item) {
  return Boolean(
    currentUser?.uid &&
      (item?.createdByUid === currentUser.uid ||
        (!item?.createdByUid &&
          item?.createdByEmail &&
          currentUser?.email &&
          item.createdByEmail === currentUser.email))
  );
}

function isCurrentUserTextOwner(item) {
  return isCurrentUserItemOwner(item);
}

function canEditItem(item) {
  return Boolean(
    item?.id &&
      currentUser?.uid &&
      (isAdminViewEnabled() || isCurrentUserItemOwner(item))
  );
}

function canEditTextPost(item) {
  return Boolean(
    item?.kind === "text" && canEditItem(item)
  );
}

function canDeleteItem(item) {
  if (!item?.id || !currentUser?.uid) {
    return false;
  }

  if (isAdminViewEnabled()) {
    return true;
  }

  if (item.kind === "text") {
    return isCurrentUserItemOwner(item);
  }

  return isCurrentUserItemOwner(item) && doesStoragePathBelongToCurrentUser(item?.storagePath);
}

function hasAlternativeFolderForItemMove(tripId, folderId) {
  if (!tripId || !folderId) {
    return false;
  }

  return getFoldersForTrip(tripId).some(
    (folder) => folder.id !== folderId && !isHighlightFolder(folder)
  );
}

function canMoveItem(item, tripId, folderId) {
  return Boolean(
    item?.id &&
      currentUser?.uid &&
      hasAlternativeFolderForItemMove(tripId, folderId) &&
      (isAdminViewEnabled() || isCurrentUserItemOwner(item))
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

  if (friend.uid === currentUser?.uid && nextRole !== friend.role) {
    select.value = friend.role;
    authDetail.textContent = STRINGS.members.selfRoleLocked;
    return;
  }

  const roleToStore = isAdminEmail(friend.email) ? ROLE_ADMIN : nextRole;

  select.disabled = true;

  try {
    await setDoc(
      doc(db, runtimeConfig.collections.users, userId),
      {
        uid: friend.uid || userId,
        email: friend.email,
        displayName: friend.displayName || "",
        photoURL: friend.photoStoragePath ? friend.photoURL || "" : "",
        photoStoragePath: friend.photoStoragePath || "",
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
  const textPreviewTrigger = event.target.closest("[data-action='preview-text']");

  if (textPreviewTrigger) {
    const tripId = String(textPreviewTrigger.getAttribute("data-trip-id") || "");
    const folderId = String(textPreviewTrigger.getAttribute("data-folder-id") || "");
    const itemId = String(textPreviewTrigger.getAttribute("data-item-id") || "");

    if (tripId && folderId && itemId) {
      openTextPreview(tripId, folderId, itemId);
    }
    return;
  }

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

  const folderDeleteTrigger = event.target.closest("[data-action='delete-folder']");

  if (folderDeleteTrigger) {
    handleFolderDeleteClick(folderDeleteTrigger);
    return;
  }

  const moveTrigger = event.target.closest("[data-action='move-item']");

  if (moveTrigger) {
    handleItemMoveClick(moveTrigger);
    return;
  }

  const deleteTrigger = event.target.closest("[data-action='delete-item']");

  if (deleteTrigger) {
    handleItemDeleteClick(deleteTrigger);
    return;
  }

  const certifiedTrigger = event.target.closest("[data-action='toggle-certified']");

  if (certifiedTrigger) {
    handleItemCertifiedToggleClick(certifiedTrigger);
    return;
  }

  const editTrigger = event.target.closest("[data-action='edit-item']");

  if (editTrigger) {
    handleItemEditClick(editTrigger);
    return;
  }

  const tripToggleSurfaceTrigger = event.target.closest("[data-trip-toggle-surface='true']");

  if (tripToggleSurfaceTrigger) {
    handleTripToggleClick(tripToggleSurfaceTrigger);
    return;
  }

  const contributeTrigger = event.target.closest("[data-action='open-contribute']");

  if (contributeTrigger) {
    const tripId = String(contributeTrigger.getAttribute("data-trip-id") || "");
    const folderId = String(contributeTrigger.getAttribute("data-folder-id") || "");

    if (tripId && folderId) {
      beginContribution(tripId, folderId);
    }
    return;
  }

  const trigger = event.target.closest("[data-action='select-folder']");

  if (!trigger) {
    return;
  }

  const tripId = String(trigger.getAttribute("data-trip-id") || "");
  const folderId = String(trigger.getAttribute("data-folder-id") || "");
  const view = String(trigger.getAttribute("data-view") || "archive");

  if (!tripId || !folderId) {
    return;
  }

  const currentFolderId = getSelectedFolderId(tripId, view);
  const nextFolderId = currentFolderId === folderId ? "" : folderId;

  setSelectedFolderId(tripId, nextFolderId, view);
  renderAll();
}

function handleTripToggleClick(trigger) {
  const tripId = String(trigger.getAttribute("data-trip-id") || "");

  if (!tripId) {
    return;
  }

  const nextExpanded = !isTripExpanded(tripId);

  if (isMobileTripLayout()) {
    trips.forEach((trip) => {
      expandedTrips.set(trip.id, false);
    });
    expandedTrips.set(tripId, nextExpanded);
  } else {
    expandedTrips.set(tripId, nextExpanded);
  }

  renderTrips();
}

function handleVideoPreviewClick(trigger) {
  const view = String(trigger.getAttribute("data-view") || "archive");
  const tripId = String(trigger.getAttribute("data-trip-id") || "");
  const folderId = String(trigger.getAttribute("data-folder-id") || "");
  const itemId = String(trigger.getAttribute("data-item-id") || "");

  if (!tripId || !folderId || !itemId) {
    return;
  }

  openVideoPreview(tripId, folderId, itemId, view);
}

function handleTripBrowserChange(event) {
  const sortSelect = event.target.closest("[data-action='sort-items']");

  if (!sortSelect) {
    return;
  }

  const tripId = String(sortSelect.getAttribute("data-trip-id") || "");
  const view = String(sortSelect.getAttribute("data-view") || "archive");
  const folderId = getSelectedFolderId(tripId, view);
  const sortMode = normalizeItemSortMode(sortSelect.value);

  if (!tripId || !folderId) {
    return;
  }

  itemSortPreferences.set(buildFolderCacheKey(tripId, folderId, view), sortMode);
  renderAll();
}

function handleItemEditClick(trigger) {
  const tripId = String(trigger.getAttribute("data-trip-id") || "");
  const folderId = String(trigger.getAttribute("data-folder-id") || "");
  const itemId = String(trigger.getAttribute("data-item-id") || "");
  const item = getItemsForFolder(tripId, folderId).find((entry) => entry.id === itemId);

  if (!tripId || !folderId || !itemId || !item) {
    return;
  }

  beginItemEdit(tripId, folderId, item);
}

function handleItemMoveClick(trigger) {
  const tripId = String(trigger.getAttribute("data-trip-id") || "");
  const folderId = String(trigger.getAttribute("data-folder-id") || "");
  const itemId = String(trigger.getAttribute("data-item-id") || "");
  const item = getItemsForFolder(tripId, folderId).find((entry) => entry.id === itemId);

  if (!tripId || !folderId || !itemId || !item) {
    return;
  }

  beginItemMove(tripId, folderId, item);
}

async function handleItemCertifiedToggleClick(trigger) {
  if (!db || !isAdminViewEnabled()) {
    return;
  }

  const tripId = String(trigger.getAttribute("data-trip-id") || "");
  const folderId = String(trigger.getAttribute("data-folder-id") || "");
  const itemId = String(trigger.getAttribute("data-item-id") || "");
  const item = getItemsForFolder(tripId, folderId).find((entry) => entry.id === itemId);

  if (!tripId || !folderId || !itemId || !item || item.kind !== "file") {
    return;
  }

  const nextCertified = !isItemCertified(item);
  const itemRef = doc(
    db,
    runtimeConfig.collections.trips,
    tripId,
    "folders",
    folderId,
    "items",
    itemId
  );

  trigger.disabled = true;

  try {
    const batch = writeBatch(db);
    batch.set(itemRef, {
      certified: nextCertified,
      updatedAt: serverTimestamp(),
      updatedByUid: currentUser?.uid || "",
      updatedByEmail: currentUser?.email || "",
    }, { merge: true });

    if (nextCertified && !getFoldersForTrip(tripId).some((folder) => isHighlightFolder(folder))) {
      batch.set(
        doc(db, runtimeConfig.collections.trips, tripId, "folders", HIGHLIGHT_FOLDER_ID),
        {
          label: HIGHLIGHT_FOLDER_LABEL,
          slug: HIGHLIGHT_FOLDER_ID,
          kind: "highlight",
          sortOrder: getHighlightFolderSortOrder(tripId),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdByUid: currentUser?.uid || "",
          updatedByUid: currentUser?.uid || "",
          updatedByEmail: currentUser?.email || "",
        },
        { merge: true }
      );
    }

    await batch.commit();

    if (nextCertified) {
      upsertHighlightFolderInState(tripId);
    }

    await loadFolderItems(tripId, folderId);
    renderAll();
    authDetail.textContent = nextCertified
      ? `${getItemDisplayName(item).toUpperCase()} CERTIFIED / ADDED TO ${HIGHLIGHT_FOLDER_LABEL}`
      : `${getItemDisplayName(item).toUpperCase()} REMOVED FROM ${HIGHLIGHT_FOLDER_LABEL}`;
  } catch (error) {
    authDetail.textContent = getErrorMessage(error, STRINGS.errors.itemCertificationFailed);
    trigger.disabled = false;
  }
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

async function handleFolderDeleteClick(trigger) {
  if (!db || !isAdminViewEnabled()) {
    return;
  }

  const tripId = String(trigger.getAttribute("data-trip-id") || "");
  const folderId = String(trigger.getAttribute("data-folder-id") || "");
  const trip = trips.find((entry) => entry.id === tripId);
  const folder = getFoldersForTrip(tripId).find((entry) => entry.id === folderId);

  if (!trip || !folder) {
    return;
  }

  const confirmed = window.confirm(
    `Delete ${trip.slug}/${folder.slug}/ and all posts, clips, and storage files?`
  );
  if (!confirmed) {
    return;
  }

  trigger.disabled = true;

  try {
    await deleteFolderCascade(trip, folder);

    const remainingFolders = getFoldersForTrip(tripId).filter((entry) => entry.id !== folderId);
    foldersByTrip.set(tripId, remainingFolders);

    if (selectedFolders.get(tripId) === folderId) {
      if (remainingFolders[0]) {
        selectedFolders.set(tripId, remainingFolders[0].id);
      } else {
        selectedFolders.delete(tripId);
      }
    }

    if (currentTextPostEdit?.tripId === tripId && currentTextPostEdit.folderId === folderId) {
      resetTextPostEditor();
    }

    if (
      currentVideoPreviewContext?.tripId === tripId &&
      currentVideoPreviewContext.folderId === folderId
    ) {
      resetVideoPreview();
    }

    pruneItemsForFolder(tripId, folderId);
    renderAll();
    authDetail.textContent = STRINGS.trips.removed(folder.slug);
  } catch (error) {
    authDetail.textContent = getErrorMessage(error, "Could not delete folder.");
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

async function deleteFolderCascade(trip, folder) {
  const itemsSnapshot = await getDocs(
    collection(
      db,
      runtimeConfig.collections.trips,
      trip.id,
      "folders",
      folder.id,
      "items"
    )
  );

  for (const itemDoc of itemsSnapshot.docs) {
    const item = normalizeItem({ id: itemDoc.id, ...itemDoc.data() });

    if (item.kind === "file" && item.storagePath) {
      if (!storage) {
        throw new Error("Storage is not ready for folder deletion.");
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

    await deleteDoc(itemDoc.ref);
  }

  await deleteDoc(
    doc(db, runtimeConfig.collections.trips, trip.id, "folders", folder.id)
  );
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
  if (!db) {
    return;
  }

  const tripId = String(trigger.getAttribute("data-trip-id") || "");
  const folderId = String(trigger.getAttribute("data-folder-id") || "");
  const itemId = String(trigger.getAttribute("data-item-id") || "");
  const items = getItemsForFolder(tripId, folderId);
  const item = items.find((entry) => entry.id === itemId);

  if (!tripId || !folderId || !itemId || !item || !canDeleteItem(item)) {
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

    if (
      currentTextPreviewContext?.tripId === tripId &&
      currentTextPreviewContext.itemId === itemId
    ) {
      resetTextPreview();
    }

    if (
      currentVideoPreviewContext?.tripId === tripId &&
      currentVideoPreviewContext.itemId === itemId
    ) {
      resetVideoPreview();
    }

    await loadFolderItems(tripId, folderId);
    renderAll();
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
  renderFeaturedMessage();
  renderAuth();
  renderRouteChrome();
  renderCurrentPage();
  renderTripCount();
  renderFooterTicker();
  renderTrips();
  renderProfilePage();
  renderAdminSelects();
  syncFeaturedMessageForm();
  renderUploadQueue();
  renderFriendsPanel();
  syncScrollBannerVisibility();
  finishRouteLoadingOverlayIfReady();
}

function renderAuth() {
  const signedIn = Boolean(currentUser?.email);
  const hasArchiveAccess = canUploadMedia();
  syncAdminPanelsToggle();

  if (desktopRouteToggleLink) {
    desktopRouteToggleLink.textContent =
      isProfileRoute() ? STRINGS.auth.archive : STRINGS.auth.profile;
  }

  if (bannerRouteToggleLink) {
    bannerRouteToggleLink.textContent =
      isProfileRoute() ? STRINGS.auth.archive : STRINGS.auth.profile;
  }

  setElementVisible(desktopRouteToggleLink, hasArchiveAccess, "inline-flex");
  setElementVisible(bannerRouteToggleLink, hasArchiveAccess, "inline-flex");

  if (!runtimeConfig) {
    authStatus.textContent = STRINGS.auth.civilianView;
    authDetail.textContent = STRINGS.auth.loading;
    setSignOutButtonsVisible(false);
    uploadQueuePanel?.classList.add("hidden");
    adminPanel?.classList.add("hidden");
    setGoogleButtonVisible(false);
    return;
  }

  if (!firestoreReady) {
    authStatus.textContent = STRINGS.auth.civilianView;
    authDetail.textContent = STRINGS.auth.configMissing;
    setSignOutButtonsVisible(false);
    uploadQueuePanel?.classList.add("hidden");
    adminPanel?.classList.add("hidden");
    setGoogleButtonVisible(false);
    return;
  }

  if (!signedIn) {
    authStatus.textContent = STRINGS.auth.civilianView;
    authDetail.textContent = firestoreAccessIssue ? STRINGS.auth.rulesBlocked : "";
    setSignOutButtonsVisible(false);
    uploadQueuePanel?.classList.add("hidden");
    adminPanel?.classList.add("hidden");
    setGoogleButtonVisible(true);
    return;
  }

  setSignOutButtonsVisible(true);
  setGoogleButtonVisible(false);

  if (isAdmin()) {
    authStatus.textContent = STRINGS.auth.adminView;
    authDetail.textContent = currentUser.email;
  } else {
    authStatus.textContent = STRINGS.auth.memberView;
    authDetail.textContent = friendAccessIssue
      ? `${currentUser.email} / ${STRINGS.auth.rulesBlocked}`
      : currentUser.email;
  }

  syncControlPanelVisibility();
}

function renderCurrentPage() {
  const showProfile = isProfileRoute();

  archivePage?.classList.toggle("hidden", showProfile);
  profilePage?.classList.toggle("hidden", !showProfile);
}

function renderTripCount() {
  if (!tripCount) {
    return;
  }

  tripCount.textContent = padCount(trips.length, STRINGS.trips.countLabel);
}

function renderFooterTicker() {
  if (!footerTickerTrack) {
    return;
  }

  const tickerText = buildFooterTickerText();
  const repeatCount = 6;
  footerTickerTrack.style.setProperty("--ticker-shift", `${100 / repeatCount}%`);
  footerTickerTrack.innerHTML = Array.from({ length: repeatCount }, (_, index) =>
    `<span class="site-footer-ticker-segment"${index === 0 ? "" : ' aria-hidden="true"'}>${escapeHtml(tickerText)}</span>`
  ).join("");
}

function buildFooterTickerText() {
  if (trips.length === 0) {
    return "100GIGZ - ARCHIVE - LOADING -\u00A0";
  }

  return `${trips
    .map((trip) => String(trip.label || trip.slug || "TRIP").toUpperCase())
    .join(" - ")} -\u00A0`;
}

function syncControlPanelVisibility() {
  const signedIn = canUploadMedia();
  const adminMode = signedIn && isAdminViewEnabled();

  adminPanel?.classList.toggle("hidden", !adminMode || isProfileRoute());
  featuredMessageForm?.classList.toggle("hidden", !adminMode);
  tripForm?.classList.toggle("hidden", !adminMode);
  folderForm?.classList.toggle("hidden", !adminMode);
  syncAuthorModeField(uploadAuthorModeSelect, uploadAuthorModeShell);
  syncAuthorModeField(textAuthorModeSelect, textAuthorModeShell);
  syncUploadQueueVisibility();
}

function renderProfilePage() {
  renderResolvedProfilePage(getActiveProfileView());
}

function renderTrips() {
  if (!tripList) {
    return;
  }

  tripList.innerHTML = renderTripSections({ view: "archive" });
  return;

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
      const activeFolderId = selectedFolder?.id || "";
      const sortMode = getItemSortMode(trip.id, activeFolderId);
      const items = getSortedItemsForFolder(trip.id, activeFolderId, sortMode);
      const pathLabel = buildFolderPathLabel(trip, selectedFolder);
      const expanded = isTripExpanded(trip.id);
      const tripToggleLabel = expanded
        ? STRINGS.trips.collapseTrip
        : STRINGS.trips.expandTrip;
      const tripShellClass = expanded
        ? "border border-white/10  bg-white/[0.02]"
        : "border border-white/10 bg-white/[0.02]";
      const tripHeaderClass = expanded
        ? "flex flex-col gap-3 border-b border-white/10 bg-[linear-gradient(to_right,rgba(38,38,38,0.08),rgba(255,255,255,0.008)_42%,transparent)] px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5"
        : "flex flex-col gap-3 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5";
      const tripContentClass = expanded
        ? "grid gap-5 bg-[linear-gradient(to_bottom,rgba(88, 88, 88, 0.25),rgba(15, 15, 15, 0.01))] p-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:p-5"
        : "hidden gap-5 p-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:p-5";

      return `
        <section class="${tripShellClass}">
          <div class="${tripHeaderClass}">
            <div class="space-y-2">
              <p class="font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.72rem] uppercase tracking-[0.3em] text-stone-300/55">${String(
                getTripSequenceNumber(trip, index)
              ).padStart(4, "0")}</p>
              <h2 class="whitespace-nowrap text-2xl uppercase tracking-[0.18em] text-stone-100 sm:text-3xl">${escapeHtml(
                `${trip.slug}/`
              )}</h2>
              <p class="font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-xs uppercase tracking-[0.18em] text-stone-300/60">${escapeHtml(
                trip.label
              )}</p>
            </div>
            <div class="max-w-full overflow-x-auto">
              <div class="flex w-max items-center gap-3 pr-1">
                <button
                  type="button"
                  data-action="toggle-trip"
                  data-trip-id="${escapeHtml(trip.id)}"
                  aria-expanded="${expanded ? "true" : "false"}"
                  class="border border-white/10 px-3 py-2 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.62rem] uppercase tracking-[0.18em] text-stone-200 transition hover:border-white/30 hover:bg-white/[0.04]"
                >
                  ${tripToggleLabel}
                </button>
                <div class="shrink-0 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.72rem] uppercase tracking-[0.2em] text-stone-300/60">
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
                        class="shrink-0 border border-white/10 px-3 py-2 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.62rem] uppercase tracking-[0.18em] text-stone-200 transition hover:border-white/30 hover:bg-white/[0.04]"
                        ${index === 0 ? "disabled" : ""}
                      >
                        ${STRINGS.trips.moveTripUp}
                      </button>
                      <button
                        type="button"
                        data-action="move-trip"
                        data-direction="down"
                        data-trip-id="${escapeHtml(trip.id)}"
                        class="shrink-0 border border-white/10 px-3 py-2 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.62rem] uppercase tracking-[0.18em] text-stone-200 transition hover:border-white/30 hover:bg-white/[0.04]"
                        ${index === trips.length - 1 ? "disabled" : ""}
                      >
                        ${STRINGS.trips.moveTripDown}
                      </button>
                      <button
                        type="button"
                        data-action="delete-trip"
                        data-trip-id="${escapeHtml(trip.id)}"
                        class="shrink-0 border border-white/10 px-3 py-2 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.62rem] uppercase tracking-[0.18em] text-stone-200 transition hover:border-red-300/35 hover:bg-red-300/10 hover:text-red-100"
                      >
                        ${STRINGS.trips.deleteTrip}
                      </button>
                    `
                    : ""
                }
              </div>
            </div>
          </div>

          <div class="${tripContentClass}">
            <aside class="border border-white/10 bg-black/25 p-4">
              <p class="font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.7rem] uppercase tracking-[0.24em] text-stone-300/65">
                Folders
              </p>
              <div class="mt-4 flex flex-col gap-2">
                ${folders
                  .map((folder) => {
                    const isSelected = folder.id === selectedFolderId;
                    const folderItemCount = getItemsForFolder(trip.id, folder.id).length;
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
                        <span class="flex items-center gap-2">
                          <span>${escapeHtml(folder.kind)}</span>
                          <span class="text-stone-400/55">${escapeHtml(String(folderItemCount))}</span>
                        </span>
                      </button>
                    `;
                  })
                  .join("")}
              </div>
            </aside>

            <div class="min-w-0 border border-white/10 bg-black/25 p-4">
              <div class="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="min-w-0 sm:self-center">
                  <p class="text-xl font-bold leading-none tracking-[0.08em] text-stone-100">${escapeHtml(
                    pathLabel
                  )}</p>
                </div>
                <div class="flex flex-col gap-3 sm:self-center sm:items-end">
                  <div class="flex flex-wrap items-center gap-3">
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
                    ${
                      adminMode && selectedFolder
                        ? `
                          <button
                            type="button"
                            data-action="delete-folder"
                            data-trip-id="${escapeHtml(trip.id)}"
                            data-folder-id="${escapeHtml(selectedFolder.id)}"
                            class="border border-white/10 px-3 py-2 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.62rem] uppercase tracking-[0.18em] text-stone-200 transition hover:border-red-300/35 hover:bg-red-300/10 hover:text-red-100"
                          >
                            Delete Folder
                          </button>
                        `
                        : ""
                    }
                  </div>
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

function renderRouteChrome() {
  const profileView = getActiveProfileView();
  const isProfileMode = isProfileRoute();
  const routeContextLabel = buildRouteContextLabel(profileView);

  if (siteShell) {
    siteShell.dataset.page = isProfileMode ? "profile" : "archive";
  }

  if (scrollBanner) {
    scrollBanner.dataset.page = isProfileMode ? "profile" : "archive";
  }

  if (headerRouteContext) {
    headerRouteContext.textContent = routeContextLabel;
    headerRouteContext.classList.toggle("hidden", !isProfileMode);
  }

  if (scrollBannerContext) {
    scrollBannerContext.textContent = routeContextLabel;
    scrollBannerContext.classList.toggle("hidden", !isProfileMode);
  }
}

function buildRouteContextLabel(profileView) {
  if (!isProfileRoute()) {
    return "";
  }

  if (profileView?.friend) {
    return `PROFILE // ${getFriendLabel(profileView.friend)} #${profileView.friend.routeId || "---"}`;
  }

  if (profileView?.state === "signin-required") {
    return "PROFILE // SIGN IN REQUIRED";
  }

  if (profileView?.state === "not-found") {
    return "PROFILE // 404";
  }

  return "PROFILE // LOADING";
}

function getActiveProfileView() {
  if (!isProfileRoute()) {
    return { state: "archive" };
  }

  if (currentRoute.kind === ROUTE_PROFILE_SELF) {
    if (!currentUser?.uid) {
      return { state: "signin-required" };
    }

    const selfProfile =
      currentUserProfile ||
      normalizeFriend({
        uid: currentUser.uid,
        email: currentUser.email || "",
        displayName: "",
        googleName: currentUser.displayName || inferNameFromEmail(currentUser.email),
        routeId: currentUserProfile?.routeId || "",
      });

    return {
      state: "ready",
      friend: selfProfile,
      isSelf: true,
    };
  }

  if (currentRoute.kind === ROUTE_PROFILE_PUBLIC) {
    const matchedFriend = getFriendByRouteId(currentRoute.routeId);

    if (matchedFriend) {
      return {
        state: "ready",
        friend: matchedFriend,
        isSelf: matchedFriend.uid === currentUser?.uid,
      };
    }

    if (!friendAccessIssue && friends.length === 0) {
      return {
        state: "loading",
        routeId: currentRoute.routeId,
      };
    }

    return {
      state: "not-found",
      routeId: currentRoute.routeId,
    };
  }

  return {
    state: "not-found",
  };
}

function renderResolvedProfilePage(profileView) {
  const friend = profileView?.friend || null;
  const isReady = profileView?.state === "ready" && friend;
  const isSelf = Boolean(isReady && friend.uid && friend.uid === currentUser?.uid);
  const authoredCount = isReady ? countAuthoredItemsForUser(friend) : 0;
  const tripMarkup = isReady
    ? renderTripSections({ view: "profile", profileFriend: friend })
    : "";
  const hasAuthoredContent = Boolean(tripMarkup.trim());

  if (profilePageTitle) {
    profilePageTitle.textContent = STRINGS.profile.title;
  }

  if (profilePageSubtitle) {
    profilePageSubtitle.textContent = isReady
      ? `${getFriendLabel(friend)} #${friend.routeId || "---"}`
      : profileView?.state === "signin-required"
        ? STRINGS.profile.signInRequired
        : profileView?.state === "not-found"
          ? STRINGS.profile.notFound
          : STRINGS.profile.loading;
  }

  if (profilePageHelper) {
    profilePageHelper.textContent = isSelf
      ? "Your public profile and authored uploads."
      : STRINGS.profile.helper;
  }

  if (profilePageStatus) {
    profilePageStatus.textContent = isReady
      ? isSelf
        ? "MANAGE MODE"
        : "PUBLIC VIEW"
      : profileView?.state === "not-found"
        ? "404"
        : "";
  }

  if (profileImagePreview) {
    profileImagePreview.src = getFriendPhotoUrl(friend);
  }

  if (profileNameDisplay) {
    profileNameDisplay.textContent = isReady ? getFriendLabel(friend) : "";
  }

  if (profileRouteDisplay) {
    profileRouteDisplay.textContent = isReady && friend.routeId ? `#${friend.routeId}` : "";
  }

  if (profileGoogleNameDisplay) {
    profileGoogleNameDisplay.textContent = isReady ? getFriendSecondaryLabel(friend) : "";
  }

  if (profilePostCountDisplay) {
    profilePostCountDisplay.textContent = isReady
      ? buildMemberPostCountLabel(authoredCount)
      : "";
  }

  if (profileImageForm) {
    profileImageForm.classList.toggle("hidden", !isSelf);
  }

  if (profileDetailsForm) {
    profileDetailsForm.classList.toggle("hidden", !isSelf);
  }

  if (profileDisplayNameInput && isSelf) {
    profileDisplayNameInput.value = friend.displayName || "";
  }

  if (profileRouteInput && isSelf) {
    profileRouteInput.value = friend.routeId || "";
  }

  if (profileTripList) {
    profileTripList.innerHTML = tripMarkup;
  }

  if (profileEmptyState) {
    const message = !isReady
      ? profileView?.state === "not-found"
        ? STRINGS.profile.notFound
        : profileView?.state === "signin-required"
          ? STRINGS.profile.signInRequired
          : STRINGS.profile.loading
      : hasAuthoredContent
        ? ""
        : STRINGS.profile.empty;
    profileEmptyState.textContent = message;
    profileEmptyState.classList.toggle("hidden", !message);
  }
}

function renderActiveFolderPanel({
  trip,
  selectedFolder,
  items,
  sortMode,
  view = "archive",
  isProfileView = false,
  adminMode = false,
  highlightFolderSelected = false,
  pathLabel = "",
  contributeMarkup = "",
  responsiveClass = "",
} = {}) {
  if (!trip || !selectedFolder) {
    return "";
  }

  const panelShellClass = highlightFolderSelected
    ? "min-w-0 border border-transparent bg-black/20 p-3 sm:p-4 lg:p-5"
    : `min-w-0 border ${isProfileView ? "border-white/10 bg-black/28" : "border-white/10 bg-black/20"} p-3 sm:p-4 lg:p-5`;
  const panelStyle = highlightFolderSelected ? getHighlightPanelStyle() : "";
  const pathMarkup = highlightFolderSelected
    ? `<span style="${getHighlightPanelTextStyle()}">${escapeHtml(pathLabel)}</span>`
    : escapeHtml(pathLabel);

  return `
    <div class="${responsiveClass} ${panelShellClass}"${panelStyle ? ` style="${panelStyle}"` : ""}>
      <div class="flex flex-col gap-3 border-b border-white/10 pb-4">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div class="min-w-0">
            <p class="font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.7rem] uppercase tracking-[0.24em] ${isProfileView ? "text-stone-300/68" : "text-stone-300/60"}">Active Folder</p>
            <p class="mt-2 break-words text-sm uppercase tracking-[0.14em] text-stone-100 sm:text-base sm:tracking-[0.16em] lg:text-lg">${pathMarkup}</p>
          </div>
          <div class="flex min-w-0 flex-col gap-3 lg:items-end">
            <div class="flex w-full flex-wrap items-center justify-start gap-2 lg:w-auto lg:justify-end lg:gap-3">
              <label class="flex w-full min-w-0 flex-col items-start gap-2 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.58rem] uppercase tracking-[0.16em] ${isProfileView ? "text-stone-300/68" : "text-stone-300/62"} sm:w-auto sm:flex-row sm:items-center sm:gap-3 sm:text-[0.62rem] sm:tracking-[0.18em]">
                <span>${STRINGS.items.sortLabel}</span>
                <select
                  data-action="sort-items"
                  data-view="${escapeHtml(view)}"
                  data-trip-id="${escapeHtml(trip.id)}"
                  class="w-full border ${isProfileView ? "border-white/12 bg-white/[0.03]" : "border-white/10 bg-black/45"} px-2 py-2 text-[0.56rem] uppercase tracking-[0.12em] text-stone-200 outline-none transition focus:border-white/30 sm:w-auto sm:text-[0.6rem] sm:tracking-[0.16em]"
                >
                  ${renderItemSortOptions(sortMode)}
                </select>
              </label>
              ${
                adminMode && !highlightFolderSelected
                  ? `
                    <button
                      type="button"
                      data-action="delete-folder"
                      data-trip-id="${escapeHtml(trip.id)}"
                      data-folder-id="${escapeHtml(selectedFolder.id)}"
                      class="border border-amber-300/32 bg-amber-100/[0.03] px-2.5 py-2 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.56rem] uppercase tracking-[0.14em] text-amber-100 transition hover:border-amber-200/55 hover:bg-amber-100/[0.08] sm:px-3 sm:text-[0.62rem] sm:tracking-[0.18em]"
                    >
                      Delete Folder
                    </button>
                  `
                  : ""
              }
              ${contributeMarkup}
            </div>
            <p class="font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.62rem] uppercase tracking-[0.14em] ${isProfileView ? "text-stone-300/68" : "text-stone-300/60"} sm:text-[0.68rem] sm:tracking-[0.18em]">
              ${isProfileView ? buildMemberPostCountLabel(items.length) : padCount(items.length, STRINGS.trips.objectsLabel)}
            </p>
          </div>
        </div>
      </div>

      <div class="mt-4 max-w-full overflow-hidden rounded-sm border ${highlightFolderSelected ? "border-amber-300/28" : isProfileView ? "border-white/10" : "border-white/8"} bg-black/18">
        <div class="relative max-h-[46vh] max-w-full overflow-x-auto overflow-y-auto overscroll-x-contain lg:max-h-[68vh] xl:max-h-[75vh]">
          <table class="w-max min-w-[26rem] border-collapse font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.58rem] tracking-[0.04em] text-stone-200/85 sm:min-w-[31rem] sm:text-[0.62rem] sm:tracking-[0.06em] lg:min-w-[37rem] lg:text-[0.68rem] lg:tracking-[0.08em] xl:min-w-full">
            <thead class="bg-white/[0.02] text-stone-300/55 uppercase">
              <tr>
                <th class="sticky top-0 z-10 min-w-[2.65rem] break-all border-b border-white/10 bg-neutral-950 px-1 py-2 text-left text-[0.48rem] font-normal leading-tight shadow-[0_1px_0_rgba(255,255,255,0.05)] sm:min-w-[3rem] sm:px-1.5 sm:py-2.5 sm:text-[0.56rem] lg:min-w-[3.4rem] lg:text-[0.68rem]">${STRINGS.items.previewColumn}</th>
                <th class="sticky top-0 z-10 min-w-[5.5rem] border-b border-white/10 bg-neutral-950 px-1.5 py-2 text-left font-normal shadow-[0_1px_0_rgba(255,255,255,0.05)] sm:min-w-[7rem] sm:px-2 sm:py-2.5 lg:min-w-[9rem]">${STRINGS.items.nameColumn}</th>
                <th class="sticky top-0 z-10 min-w-[3.25rem] border-b border-white/10 bg-neutral-950 px-1.5 py-2 text-left font-normal shadow-[0_1px_0_rgba(255,255,255,0.05)] sm:min-w-[4rem] sm:px-2 sm:py-2.5 lg:min-w-[4.75rem]">${STRINGS.items.typeColumn}</th>
                <th class="sticky top-0 z-10 min-w-[4.1rem] border-b border-white/10 bg-neutral-950 px-1.5 py-2 text-left font-normal shadow-[0_1px_0_rgba(255,255,255,0.05)] sm:min-w-[5.25rem] sm:px-2 sm:py-2.5 lg:min-w-[6.5rem]">${STRINGS.items.authorColumn}</th>
                <th class="sticky top-0 z-10 min-w-[4.8rem] border-b border-white/10 bg-neutral-950 px-1.5 py-2 text-left font-normal shadow-[0_1px_0_rgba(255,255,255,0.05)] sm:min-w-[6rem] sm:px-2 sm:py-2.5 lg:min-w-[7.5rem]">${STRINGS.items.certifiedColumn}</th>
                <th class="sticky top-0 z-10 min-w-[6.5rem] border-b border-white/10 bg-neutral-950 px-1.5 py-2 text-left font-normal shadow-[0_1px_0_rgba(255,255,255,0.05)] sm:min-w-[8rem] sm:px-2 sm:py-2.5 lg:min-w-[10rem]">${STRINGS.items.metaColumn}</th>
              </tr>
            </thead>
            <tbody>
              ${renderItemRows(items, trip.id, selectedFolder.id, view)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderTripSections({ view = "archive", profileFriend = null } = {}) {
  if (trips.length === 0) {
    return `
      <section class="border border-white/10 bg-white/[0.02] p-5">
        <p class="font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-sm uppercase tracking-[0.2em] text-stone-300/60">
          ${escapeHtml(STRINGS.trips.noTrips)}
        </p>
      </section>
    `;
  }

  const sections = trips
    .map((trip, index) => renderTripSection(trip, index, { view, profileFriend }))
    .filter(Boolean)
    .join("");

  return sections;
}

function renderTripSection(trip, index, { view = "archive", profileFriend = null } = {}) {
  const isProfileView = view === "profile";
  const adminMode = !isProfileView && isAdminViewEnabled();
  const adminContextButtonClass = "shrink-0 border border-amber-300/32 bg-amber-100/[0.03] px-2.5 py-2 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.56rem] uppercase tracking-[0.14em] text-amber-100 transition hover:border-amber-200/55 hover:bg-amber-100/[0.08] disabled:cursor-not-allowed disabled:opacity-40 sm:px-3 sm:text-[0.62rem] sm:tracking-[0.18em]";
  const folders = isProfileView
    ? getProfileFoldersForTrip(profileFriend, trip.id)
    : getFoldersForTrip(trip.id);

  if (folders.length === 0) {
    return "";
  }

  const selectedFolderId = getSelectedFolderId(trip.id, view, folders);
  const selectedFolder = folders.find((folder) => folder.id === selectedFolderId) || null;
  const activeFolderId = selectedFolder?.id || "";
  const sortMode = getItemSortMode(trip.id, activeFolderId, view);
  const items = !selectedFolder
    ? []
    : isProfileView
      ? getProfileItemsForFolder(profileFriend, trip.id, activeFolderId, sortMode)
      : getSortedItemsForFolder(trip.id, activeFolderId, sortMode);
  const expanded = isProfileView ? true : isTripExpanded(trip.id);
  const pathLabel = selectedFolder ? buildFolderPathLabel(trip, selectedFolder) : `${trip.slug}/`;
  const highlightFolderSelected = isHighlightFolder(selectedFolder);
  const tripToggleLabel = expanded ? STRINGS.trips.collapseTrip : STRINGS.trips.expandTrip;
  const shellClass = isProfileView
    ? "border border-white/12 bg-[linear-gradient(to_bottom,rgba(38,38,38,0.18),rgba(255,255,255,0.02)_40%,rgba(0,0,0,0.1))]"
    : "border border-white/10 bg-white/[0.02]";
  const headerClass = isProfileView
    ? "flex flex-col gap-3 border-b border-white/10 bg-[linear-gradient(to_right,rgba(38,38,38,0.18),rgba(255,255,255,0.01)_46%,transparent)] px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5"
    : expanded
      ? "flex flex-col gap-3 border-b border-white/10 bg-[linear-gradient(to_right,rgba(38,38,38,0.08),rgba(255,255,255,0.008)_42%,transparent)] px-4 py-4 transition hover:bg-[linear-gradient(to_right,rgba(52,52,52,0.11),rgba(255,255,255,0.014)_42%,transparent)] sm:flex-row sm:items-end sm:justify-between sm:px-5"
      : "flex flex-col gap-3 border-b border-white/10 px-4 py-4 transition hover:bg-[linear-gradient(to_right,rgba(40,40,40,0.08),rgba(255,255,255,0.012)_42%,transparent)] sm:flex-row sm:items-end sm:justify-between sm:px-5";
  const contentClass = expanded
    ? "grid gap-5 p-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:p-5"
    : "hidden gap-5 p-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:p-5";
  const folderRailClass = selectedFolder
    ? "min-w-0 border"
    : "min-w-0 border lg:col-span-2";
  const contributeMarkup =
    !isProfileView && canUploadMedia() && selectedFolder && !highlightFolderSelected
      ? `
        <button
          type="button"
          data-action="open-contribute"
          data-trip-id="${escapeHtml(trip.id)}"
          data-folder-id="${escapeHtml(selectedFolder.id)}"
          class="inline-flex items-center justify-center whitespace-nowrap border border-white/10 px-2.5 py-2 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.56rem] uppercase tracking-[0.14em] text-stone-200 transition hover:border-white/30 hover:bg-white/[0.08] sm:px-3 sm:text-[0.62rem] sm:tracking-[0.18em]"
          aria-label="Add to ${escapeHtml(pathLabel)}"
        >
          + ADD
        </button>
      `
      : "";
  const headerToggleAttributes = isProfileView
    ? ""
    : ` data-trip-toggle-surface="true" data-trip-id="${escapeHtml(trip.id)}"`;
  const headerInteractiveClass = isProfileView ? "" : " cursor-pointer select-none";
  const mobileActiveFolderPanelMarkup = selectedFolder
    ? renderActiveFolderPanel({
        trip,
        selectedFolder,
        items,
        sortMode,
        view,
        isProfileView,
        adminMode,
        highlightFolderSelected,
        pathLabel,
        contributeMarkup,
        responsiveClass: "mt-4 lg:hidden",
      })
    : "";
  const desktopActiveFolderPanelMarkup = selectedFolder
    ? renderActiveFolderPanel({
        trip,
        selectedFolder,
        items,
        sortMode,
        view,
        isProfileView,
        adminMode,
        highlightFolderSelected,
        pathLabel,
        contributeMarkup,
        responsiveClass: "hidden lg:block",
      })
    : "";

  return `
    <section class="${shellClass}">
      <div class="${headerClass}${headerInteractiveClass}"${headerToggleAttributes}>
        <div class="space-y-2">
          <p class="font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.72rem] uppercase tracking-[0.3em] ${isProfileView ? "text-stone-200/72" : "text-stone-300/55"}">${String(
            getTripSequenceNumber(trip, index)
          ).padStart(4, "0")}</p>
          <h2 class="whitespace-nowrap text-2xl uppercase tracking-[0.18em] text-stone-100 sm:text-3xl">${escapeHtml(`${trip.slug}/`)}</h2>
          <p class="font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-xs uppercase tracking-[0.18em] ${isProfileView ? "text-stone-300/60" : "text-stone-300/60"}">${escapeHtml(trip.label)}</p>
        </div>
        <div class="min-w-0 w-full">
          <div class="flex w-full flex-wrap items-center justify-start gap-2 sm:justify-end sm:gap-3 sm:pr-1">
            ${
              isProfileView
                ? `<div class="shrink-0 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.62rem] uppercase tracking-[0.16em] text-stone-300/68 sm:text-[0.68rem] sm:tracking-[0.2em]">AUTHORED TRIP</div>`
                : `
                  <button
                    type="button"
                    data-action="toggle-trip"
                    data-trip-id="${escapeHtml(trip.id)}"
                    aria-expanded="${expanded ? "true" : "false"}"
                    class="border border-white/10 px-2.5 py-2 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.56rem] uppercase tracking-[0.14em] text-stone-200 transition hover:border-white/30 hover:bg-white/[0.04] sm:px-3 sm:text-[0.62rem] sm:tracking-[0.18em]"
                  >
                    ${tripToggleLabel}
                  </button>
                `
            }
            <div class="shrink-0 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.62rem] uppercase tracking-[0.16em] ${isProfileView ? "text-stone-300/68" : "text-stone-300/60"} sm:text-[0.72rem] sm:tracking-[0.2em]">
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
                    class="${adminContextButtonClass}"
                    ${index === 0 ? "disabled" : ""}
                  >
                    ${STRINGS.trips.moveTripUp}
                  </button>
                  <button
                    type="button"
                    data-action="move-trip"
                    data-direction="down"
                    data-trip-id="${escapeHtml(trip.id)}"
                    class="${adminContextButtonClass}"
                    ${index === trips.length - 1 ? "disabled" : ""}
                  >
                    ${STRINGS.trips.moveTripDown}
                  </button>
                  <button
                    type="button"
                    data-action="delete-trip"
                    data-trip-id="${escapeHtml(trip.id)}"
                    class="${adminContextButtonClass}"
                  >
                    ${STRINGS.trips.deleteTrip}
                  </button>
                `
                : ""
            }
          </div>
        </div>
      </div>

      <div class="${contentClass}">
        <aside class="${folderRailClass} ${isProfileView ? "border-white/10 bg-black/30" : "border-white/10 bg-black/25"} p-4">
          <p class="font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.7rem] uppercase tracking-[0.24em] ${isProfileView ? "text-stone-300/68" : "text-stone-300/65"}">
            Folders
          </p>
          <div class="mt-4 flex min-w-0 flex-col gap-2">
            ${renderTripFolderButtons(trip, folders, selectedFolderId, view, profileFriend, mobileActiveFolderPanelMarkup)}
          </div>
        </aside>
        ${desktopActiveFolderPanelMarkup}
      </div>
    </section>
  `;
}

function renderTripFolderButtons(trip, folders, selectedFolderId, view = "archive", profileFriend = null, mobileActiveFolderPanelMarkup = "") {
  return folders
    .map((folder) => {
      const isSelected = folder.id === selectedFolderId;
      const highlightFolder = isHighlightFolder(folder);
      const folderItems = view === "profile"
        ? getProfileItemsForFolder(profileFriend, trip.id, folder.id)
        : getItemsForFolder(trip.id, folder.id);
      const buttonStyle = highlightFolder ? getHighlightButtonStyle(isSelected) : "";
      const labelMarkup = highlightFolder
        ? `<span style="${getHighlightTextStyle()}">${escapeHtml(buildFolderButtonLabel(trip, folder))}</span>`
        : escapeHtml(buildFolderButtonLabel(trip, folder));
      const countMarkup = highlightFolder
        ? `<span class="font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.62rem] tracking-[0.16em]" style="${getHighlightTextStyle()}">${escapeHtml(String(folderItems.length))}</span>`
        : `<span class="font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.62rem] tracking-[0.16em] text-stone-400/72">${escapeHtml(String(folderItems.length))}</span>`;

      return `
        <button
          type="button"
          data-action="select-folder"
          data-view="${escapeHtml(view)}"
          data-trip-id="${escapeHtml(trip.id)}"
          data-folder-id="${escapeHtml(folder.id)}"
          class="flex w-full min-w-0 items-center justify-between gap-3 border px-3 py-3 text-left transition ${
            highlightFolder
              ? "border-transparent bg-[rgba(16,12,3,0.16)] text-stone-100 hover:opacity-95"
              : isSelected
              ? "border-stone-100 bg-white/[0.08] text-stone-100"
              : "border-white/10 bg-black/20 text-stone-200 hover:border-white/28 hover:bg-white/[0.04]"
          }"${buttonStyle ? ` style="${buttonStyle}"` : ""}
        >
          <span class="min-w-0 flex-1 break-words text-sm uppercase tracking-[0.14em]">${labelMarkup}</span>
          <span class="shrink-0">${countMarkup}</span>
        </button>
        ${isSelected ? mobileActiveFolderPanelMarkup : ""}
      `;
    })
    .join("");
}

function getProfileFoldersForTrip(friend, tripId) {
  return getFoldersForTrip(tripId).filter(
    (folder) => getProfileItemsForFolder(friend, tripId, folder.id).length > 0
  );
}

function getProfileItemsForFolder(friend, tripId, folderId, sortMode = ITEM_SORT_MEDIA_DATE_ASC) {
  const items = getItemsForFolder(tripId, folderId).filter((item) =>
    isItemAuthoredByUser(item, friend)
  );

  return [...items].sort((left, right) => compareItems(left, right, sortMode));
}

function countAuthoredItemsForUser(friend) {
  let count = 0;

  itemsByFolder.forEach((folderItems) => {
    folderItems.forEach((item) => {
      if (isItemAuthoredByUser(item, friend)) {
        count += 1;
      }
    });
  });

  return count;
}

function buildMemberPostCountLabel(count) {
  const total = Number(count || 0);
  return total === 1 ? "1 POST" : `${total} POSTS`;
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

function renderItemRows(items, tripId, folderId, view = "archive") {
  if (items.length === 0) {
    return `
      <tr class="text-stone-300/45 uppercase">
        <td class="align-middle border-b border-white/8 px-2 py-2.5">${STRINGS.items.noObjects}</td>
        <td class="align-middle border-b border-white/8 px-2 py-2.5">----</td>
        <td class="align-middle border-b border-white/8 px-2 py-2.5">${STRINGS.items.emptyName}</td>
        <td class="align-middle border-b border-white/8 px-2 py-2.5">${STRINGS.items.emptyName}</td>
        <td class="align-middle border-b border-white/8 px-2 py-2.5">${STRINGS.items.emptyName}</td>
        <td class="align-middle border-b border-white/8 px-2 py-2.5">${STRINGS.items.emptyName}</td>
      </tr>
    `;
  }

  return items
    .map((item) => {
      const displayName = getItemDisplayName(item);
      const certifiedRow = isItemCertified(item);
      const typeLabel =
        item.kind === "text"
          ? STRINGS.items.post
          : item.extension || simplifyMimeType(item.mimeType) || "FILE";
      const sourceFolderId = resolveItemSourceFolderId(item, folderId);
      const preview = renderItemPreview(item, tripId, folderId, view, certifiedRow);
      const author = renderItemAuthor(item);
      const certified = renderItemCertified(item);
      const meta = renderItemMeta(item, tripId, sourceFolderId);
      const cellBorderClass = "border-b border-white/8";
      const nameMarkup =
        item.kind === "text"
          ? `<div class="text-stone-100">${escapeHtml(item.title || item.name)}</div>`
          : `<a class="text-stone-100 underline-offset-4 hover:text-white hover:underline" href="${escapeHtml(
              item.downloadURL
            )}" target="_blank" rel="noreferrer">${escapeHtml(displayName)}</a>`;

      return `
        <tr class="transition hover:bg-white/[0.03]${certifiedRow ? " bg-[rgba(255,221,138,0.012)]" : ""}"${certifiedRow ? ` style="${getCertifiedRowStyle()}"` : ""}>
          <td class="align-middle min-w-[2.65rem] ${cellBorderClass} px-1 py-1.5 sm:min-w-[3rem] sm:px-1.5 sm:py-2 lg:min-w-[3.4rem]">${preview}</td>
          <td class="align-middle min-w-[5.5rem] ${cellBorderClass} px-1.5 py-2 sm:min-w-[7rem] sm:px-2 lg:min-w-[9rem]">${nameMarkup}</td>
          <td class="align-middle min-w-[3.25rem] ${cellBorderClass} px-1.5 py-2 uppercase text-stone-300/72 sm:min-w-[4rem] sm:px-2 lg:min-w-[4.75rem]">${escapeHtml(
            typeLabel
          )}</td>
          <td class="align-middle min-w-[4.1rem] ${cellBorderClass} px-1.5 py-2 uppercase text-stone-300/72 sm:min-w-[5.25rem] sm:px-2 lg:min-w-[6.5rem]">${author}</td>
          <td class="align-middle min-w-[4.8rem] ${cellBorderClass} px-1.5 py-2 uppercase text-stone-300/72 sm:min-w-[6rem] sm:px-2 lg:min-w-[7.5rem]">${certified}</td>
          <td class="align-middle min-w-[6.5rem] ${cellBorderClass} px-1.5 py-2 uppercase text-stone-300/72 sm:min-w-[8rem] sm:px-2 lg:min-w-[10rem]">${meta}</td>
        </tr>
      `;
    })
    .join("");
}

function renderItemCertified(item) {
  if (!isItemCertified(item)) {
    return "";
  }

  return `<span class="font-['Teko',sans-serif] text-[1.15rem] leading-none tracking-[0.18em]" style="${getHighlightTextStyle()}">${escapeHtml(HIGHLIGHT_FOLDER_LABEL)}</span>`;
}

function renderItemMeta(item, tripId, folderId) {
  const adminContext = isAdminViewEnabled();
  const neutralEditButtonClass = "inline-flex border border-white/10 px-1.5 py-0.5 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.54rem] uppercase tracking-[0.16em] text-stone-200 transition hover:border-white/30 hover:bg-white/[0.04]";
  const accentMoveButtonClass = "inline-flex border border-white/10 px-1.5 py-0.5 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.54rem] uppercase tracking-[0.16em] text-stone-200 transition hover:border-white/30 hover:bg-white/[0.08]";
  const accentDeleteButtonClass = "inline-flex border border-white/10 px-1.5 py-0.5 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.54rem] uppercase tracking-[0.16em] text-stone-200 transition hover:border-red-300/35 hover:bg-red-300/10 hover:text-red-100";
  const adminActionButtonClass = "inline-flex border border-amber-300/32 bg-amber-100/[0.03] px-1.5 py-0.5 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.54rem] uppercase tracking-[0.16em] text-amber-100 transition hover:border-amber-200/55 hover:bg-amber-100/[0.08]";
  const certifyButtonClass = "inline-flex h-6 w-6 items-center justify-center border border-amber-300/32 bg-amber-100/[0.03] px-0 py-0 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.68rem] leading-none text-amber-100 transition hover:border-amber-200/55 hover:bg-amber-100/[0.08]";
  const certifyActiveButtonClass = "inline-flex h-6 w-6 items-center justify-center border border-transparent px-0 py-0 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.68rem] leading-none text-amber-50 transition hover:opacity-95";
  const summary =
    item.kind === "text"
      ? STRINGS.items.textPost
      : `${formatBytes(item.size)} / ${escapeHtml(getItemDisplayName(item))}`;
  const descriptionMarkup =
    item.kind === "file" && item.description
      ? `<div class="mt-1.5 normal-case text-[0.58rem] leading-4 tracking-[0.04em] text-stone-300/72">${escapeHtml(
          item.description
        )}</div>`
      : "";
  const actionButtons = [];

  if (adminContext && item.kind === "file") {
    actionButtons.push(`
      <button
        type="button"
        data-action="toggle-certified"
        data-trip-id="${escapeHtml(tripId)}"
        data-folder-id="${escapeHtml(folderId)}"
        data-item-id="${escapeHtml(item.id)}"
        class="${isItemCertified(item) ? certifyActiveButtonClass : certifyButtonClass}"
        ${isItemCertified(item) ? `style="${getHighlightButtonStyle(true)}"` : ""}
        title="${isItemCertified(item) ? "Remove Certification" : "Certify Media"}"
        aria-label="${isItemCertified(item) ? "Remove Certification" : "Certify Media"}"
      >
        ${isItemCertified(item) ? "&#9733;" : "&#9734;"}
      </button>
    `);
  }

  if (canEditItem(item)) {
    actionButtons.push(`
      <button
        type="button"
        data-action="edit-item"
        data-trip-id="${escapeHtml(tripId)}"
        data-folder-id="${escapeHtml(folderId)}"
        data-item-id="${escapeHtml(item.id)}"
        class="${adminContext ? adminActionButtonClass : neutralEditButtonClass}"
      >
        ${STRINGS.items.edit}
      </button>
    `);
  }

  if (canMoveItem(item, tripId, folderId)) {
    actionButtons.push(`
      <button
        type="button"
        data-action="move-item"
        data-trip-id="${escapeHtml(tripId)}"
        data-folder-id="${escapeHtml(folderId)}"
        data-item-id="${escapeHtml(item.id)}"
        class="${adminContext ? adminActionButtonClass : accentMoveButtonClass}"
      >
        ${STRINGS.items.move}
      </button>
    `);
  }

  if (canDeleteItem(item)) {
    actionButtons.push(`
      <button
        type="button"
        data-action="delete-item"
        data-trip-id="${escapeHtml(tripId)}"
        data-folder-id="${escapeHtml(folderId)}"
        data-item-id="${escapeHtml(item.id)}"
        class="${adminContext ? adminActionButtonClass : accentDeleteButtonClass}"
      >
        ${STRINGS.items.delete}
      </button>
    `);
  }

  const actionsMarkup =
    actionButtons.length > 0
      ? `<div class="mt-2 flex flex-wrap gap-1.5">${actionButtons.join("")}</div>`
      : "";

  return `${summary}${descriptionMarkup}${actionsMarkup}`;
}

function renderItemPreview(item, tripId, folderId, view = "archive", certified = false) {
  const displayName = getItemDisplayName(item);
  const previewBorderClass = certified ? "border-amber-300/54" : "border-white/20";
  const previewRingClass = certified ? "ring-1 ring-amber-300/46" : "ring-1 ring-white/18";
  const previewPanelClass = certified
    ? "bg-[linear-gradient(to_bottom,rgba(78,56,12,0.52),rgba(22,15,5,0.38))]"
    : "bg-[linear-gradient(to_bottom,rgba(255,255,255,0.1),rgba(255,255,255,0.03))]";

  if (item.kind === "text") {
    return `
      <button
        type="button"
        data-action="preview-text"
        data-view="${escapeHtml(view)}"
        data-trip-id="${escapeHtml(tripId)}"
        data-folder-id="${escapeHtml(folderId)}"
        data-item-id="${escapeHtml(item.id)}"
        class="group flex h-9 w-[2.55rem] flex-col justify-between border ${previewBorderClass} ${previewPanelClass} px-1 py-1 text-left shadow-[inset_0_0_0_1px_rgba(255,255,255,0.025)] transition hover:border-white/30 hover:bg-white/[0.08] sm:h-10 sm:w-[2.75rem]"
        aria-label="Preview ${escapeHtml(displayName)}"
      >
        <span class="font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.48rem] uppercase tracking-[0.08em] text-stone-100">TXT</span>
        <span class="line-clamp-1 text-[0.42rem] uppercase tracking-[0.04em] text-stone-300/72 group-hover:text-stone-200">${escapeHtml(displayName)}</span>
      </button>
    `;
  }

  if (item.mimeType.startsWith("image/")) {
    return `
      <a href="${escapeHtml(item.downloadURL)}" target="_blank" rel="noreferrer" class="inline-block border ${previewBorderClass} ${previewPanelClass} p-[1px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.025)]">
        <img src="${escapeHtml(item.downloadURL)}" alt="${escapeHtml(
      displayName
    )}" class="h-9 w-[2.55rem] object-cover ${previewRingClass} sm:h-10 sm:w-[2.75rem]">
      </a>
    `;
  }

  if (item.mimeType.startsWith("video/")) {
    if (item.posterDownloadURL) {
      return `
        <button
          type="button"
          data-action="preview-video"
          data-view="${escapeHtml(view)}"
          data-trip-id="${escapeHtml(tripId)}"
          data-folder-id="${escapeHtml(folderId)}"
          data-item-id="${escapeHtml(item.id)}"
          class="group relative inline-block border ${previewBorderClass} ${previewPanelClass} p-[1px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.025)] transition hover:opacity-90"
          aria-label="Preview ${escapeHtml(displayName)}"
        >
          <img src="${escapeHtml(item.posterDownloadURL)}" alt="${escapeHtml(
        displayName
      )}" class="block h-9 w-[2.55rem] overflow-hidden object-cover ${previewRingClass} sm:h-10 sm:w-[2.75rem]">
          <span class="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span class="flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-full border border-white/24 bg-black/62 text-[0.38rem] text-white/90 sm:h-5 sm:w-5 sm:text-[0.42rem]">
              &#9654;
            </span>
          </span>
        </button>
      `;
    }

    return `
      <button
        type="button"
        data-action="preview-video"
        data-view="${escapeHtml(view)}"
        data-trip-id="${escapeHtml(tripId)}"
        data-folder-id="${escapeHtml(folderId)}"
        data-item-id="${escapeHtml(item.id)}"
        class="inline-flex h-9 w-[2.55rem] items-center justify-center border ${previewBorderClass} ${certified ? "bg-[rgba(62,46,12,0.44)]" : "bg-[rgba(255,255,255,0.08)]"} text-[0.44rem] uppercase tracking-[0.06em] text-stone-300/72 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.025)] transition hover:border-white/25 hover:text-stone-100 sm:h-10 sm:w-[2.75rem] sm:text-[0.5rem]"
        aria-label="Preview ${escapeHtml(displayName)}"
      >
        &#9654;
      </button>
    `;
  }

  return `<a class="text-stone-100 underline-offset-4 hover:text-white hover:underline uppercase" href="${escapeHtml(
    item.downloadURL
  )}" target="_blank" rel="noreferrer">${STRINGS.uploads.genericFile}</a>`;
}

function renderItemAuthor(item) {
  const authorLabel = resolveItemAuthorLabel(item);
  const authorRouteId = getItemAuthorRouteId(item);

  if (!authorLabel) {
    return `<span class="text-stone-300/40">${STRINGS.items.emptyName}</span>`;
  }

  if (!authorRouteId || isItemBrandAuthored(item)) {
    return `<span class="text-stone-200/82">${escapeHtml(authorLabel)}</span>`;
  }

  return `<a class="text-stone-100/82 underline-offset-4 hover:text-white hover:underline" href="${escapeHtml(
    buildProfilePath(authorRouteId)
  )}">${escapeHtml(authorLabel)}</a>`;
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

  syncUploadQueueVisibility();
}

function syncUploadQueueVisibility() {
  if (!uploadQueuePanel) {
    return;
  }

  const shouldShow = Boolean(
    canUploadMedia() &&
      contributeModalOpen &&
      (
        currentContributionContext?.mode === "upload" ||
        uploadJobs.length > 0
      )
  );

  uploadQueuePanel.classList.toggle("hidden", !shouldShow);
}

function renderFriendsPanel() {
  const signedIn = Boolean(currentUser?.email);
  const visibleMembers = getVisibleMembers();
  const authoredCounts = new Map(
    visibleMembers.map((friend) => [friend.uid || friend.id, countAuthoredItemsForUser(friend)])
  );
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

  if (friendsMobileInlineCount) {
    friendsMobileInlineCount.textContent = countLabel;
  }

  if (friendsDesktopStatus) {
    friendsDesktopStatus.textContent = statusText;
    friendsDesktopStatus.classList.toggle("hidden", !statusText);
  }

  if (friendsMobileStatus) {
    friendsMobileStatus.textContent = statusText;
    friendsMobileStatus.classList.toggle("hidden", !statusText);
  }

  if (friendsMobileInlineStatus) {
    friendsMobileInlineStatus.textContent = statusText;
    friendsMobileInlineStatus.classList.toggle("hidden", !statusText);
  }

  const markup = visibleMembers.length === 0
      ? `
        <div class="border border-white/10 bg-black/20 px-3 py-3 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.72rem] uppercase tracking-[0.18em] text-stone-300/55">
          ${STRINGS.members.empty}
        </div>
      `
      : visibleMembers
          .map((friend) =>
            renderFriendCard(friend, authoredCounts.get(friend.uid || friend.id) || 0)
          )
          .join("");

  if (friendsDesktopList) {
    friendsDesktopList.innerHTML = markup;
  }

  if (friendsMobileList) {
    friendsMobileList.innerHTML = markup;
  }

  if (friendsMobileInlineList) {
    friendsMobileInlineList.innerHTML = markup;
  }

  if (friendsMobileInlineShell) {
    friendsMobileInlineShell.classList.toggle("hidden", signedIn);
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

function getSelectedFolderId(tripId, view = "archive", fallbackFolders = null) {
  const folders = Array.isArray(fallbackFolders) ? fallbackFolders : getFoldersForTrip(tripId);
  const selectionMap = getFolderSelectionMap(view);
  const selectionKey = buildFolderSelectionKey(tripId, view);
  const hasStoredSelection = selectionMap.has(selectionKey);
  const currentSelection = selectionMap.get(selectionKey);

  if (hasStoredSelection) {
    if (!currentSelection) {
      return "";
    }

    if (folders.some((folder) => folder.id === currentSelection)) {
      return currentSelection;
    }
  }

  if (folders.length === 0) {
    selectionMap.delete(selectionKey);
    return "";
  }

  const defaultFolderId = folders[0]?.id || "";
  selectionMap.set(selectionKey, defaultFolderId);
  return defaultFolderId;
}

function setSelectedFolderId(tripId, folderId, view = "archive") {
  const selectionMap = getFolderSelectionMap(view);
  selectionMap.set(buildFolderSelectionKey(tripId, view), String(folderId || ""));
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
    trip.folders && trip.folders.length > 0 ? trip.folders : [];

  return folderSeeds.map((folderSlug, index) =>
    normalizeFolder(
      {
        id: slugifyFolder(folderSlug),
        label: slugifyFolder(folderSlug),
        slug: folderSlug,
        kind: classifyFolderKind(folderSlug),
        sortOrder: index,
      },
      index
    )
  );
}

function isTripExpanded(tripId) {
  if (expandedTrips.has(tripId)) {
    return expandedTrips.get(tripId);
  }

  expandedTrips.set(tripId, false);
  return false;
}

function isMobileTripLayout() {
  return window.innerWidth < 1024;
}

function enforceSingleExpandedTripOnMobile() {
  if (!isMobileTripLayout()) {
    return false;
  }

  const expandedTripIds = trips
    .map((trip) => trip.id)
    .filter((tripId) => Boolean(expandedTrips.get(tripId)));

  if (expandedTripIds.length <= 1) {
    return false;
  }

  const keepTripId = expandedTripIds[0];
  trips.forEach((trip) => {
    expandedTrips.set(trip.id, trip.id === keepTripId);
  });

  return true;
}

function getItemsForFolder(tripId, folderId) {
  if (isHighlightFolder(folderId)) {
    const aggregatedItems = [];
    const seenItems = new Set();

    getFoldersForTrip(tripId)
      .filter((folder) => !isHighlightFolder(folder))
      .forEach((folder) => {
        const folderItems = itemsByFolder.get(buildFolderCacheKey(tripId, folder.id)) || [];

        folderItems.forEach((item) => {
          if (!isItemCertified(item)) {
            return;
          }

          const sourceFolderId = resolveItemSourceFolderId(item, folder.id);
          const itemKey = `${sourceFolderId}:${item.id}`;

          if (seenItems.has(itemKey)) {
            return;
          }

          seenItems.add(itemKey);
          aggregatedItems.push(item);
        });
      });

    return aggregatedItems;
  }

  return itemsByFolder.get(buildFolderCacheKey(tripId, folderId)) || [];
}

async function loadFolderItems(tripId, folderId) {
  if (!tripId || !folderId || !db) {
    return [];
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

  const snapshot = await getDocs(itemsQuery);
  const items = snapshot.docs.map((itemDoc) =>
    normalizeItem({ id: itemDoc.id, ...itemDoc.data() })
  );
  itemsByFolder.set(cacheKey, items);
  return items;
}

async function loadAllFolderItemsForTrip(tripId, folders) {
  if (!tripId || !db || !Array.isArray(folders) || folders.length === 0) {
    return;
  }

  try {
    await Promise.all(folders.map((folder) => loadFolderItems(tripId, folder.id)));
  } catch (error) {
    showWarning(getFriendlyFirestoreMessage(error));
  }
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

function getItemSortMode(tripId, folderId, view = "archive") {
  const cacheKey = buildFolderCacheKey(tripId, folderId, view);
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

function buildFolderCacheKey(tripId, folderId, view = "archive") {
  return `${view}:${tripId}:${folderId}`;
}

function buildFolderSelectionKey(tripId, view = "archive") {
  if (view === "profile") {
    const routeKey = currentRoute?.kind === ROUTE_PROFILE_PUBLIC
      ? currentRoute.routeId
      : "self";
    return `${routeKey}:${tripId}`;
  }

  return tripId;
}

function getFolderSelectionMap(view = "archive") {
  return view === "profile" ? profileSelectedFolders : selectedFolders;
}

function doesStoragePathBelongToCurrentUser(storagePath) {
  return Boolean(
    currentUser?.uid &&
      String(storagePath || "").includes(`/${currentUser.uid}/`)
  );
}

function hasOwnProperty(value, key) {
  return Boolean(value && Object.prototype.hasOwnProperty.call(value, key));
}

function isHighlightFolder(value) {
  if (!value) {
    return false;
  }

  const slug = typeof value === "string"
    ? value
    : value.slug || value.label || value.id || "";

  return slugifyFolder(slug) === HIGHLIGHT_FOLDER_ID;
}

function getFolderDisplaySlug(folder) {
  if (!folder) {
    return "";
  }

  return isHighlightFolder(folder)
    ? HIGHLIGHT_FOLDER_LABEL
    : String(folder.slug || folder.id || "");
}

function getHighlightTextStyle() {
  return "-webkit-background-clip:text;background-clip:text;background-image:linear-gradient(135deg,#fff8cb 0%,#ffe57c 32%,#ffc93a 66%,#8a5600 100%);color:transparent;";
}

function getHighlightPanelTextStyle() {
  return "color:#d2c08a;text-shadow:0 0 8px rgba(255,208,96,0.045);";
}

function getHighlightButtonStyle(isSelected = false) {
  const fill = isSelected
    ? "rgba(12,12,12,0.96),rgba(5,5,5,0.96)"
    : "rgba(10,10,10,0.92),rgba(5,5,5,0.9)";

  return `border-color:transparent;background-image:linear-gradient(${fill}),linear-gradient(135deg,#fff7be 0%,#ffe063 34%,#ffc021 68%,#7f5000 100%);background-origin:border-box;background-clip:padding-box,border-box;box-shadow:${isSelected ? "0 0 22px rgba(255,199,58,0.12)" : "inset 0 0 0 1px rgba(255,225,122,0.08)"};`;
}

function getHighlightPanelStyle() {
  return "border-color:transparent;background-image:linear-gradient(rgba(9,9,9,0.972),rgba(5,5,5,0.962)),linear-gradient(135deg,rgba(233,211,132,0.58) 0%,rgba(198,151,55,0.56) 48%,rgba(122,86,18,0.66) 100%);background-origin:border-box;background-clip:padding-box,border-box;box-shadow:inset 0 0 0 1px rgba(255,225,122,0.022),0 0 12px rgba(255,191,31,0.025);";
}

function getCertifiedRowStyle() {
  return "background-color:rgba(255,221,138,0.014);";
}

function isItemCertified(item) {
  return Boolean(item?.certified);
}

function resolveItemSourceFolderId(item, fallbackFolderId = "") {
  return String(item?.folderId || fallbackFolderId || "");
}

function buildFolderPathLabel(trip, folder) {
  if (!trip) {
    return "/";
  }

  if (!folder) {
    return `${trip.slug}/`;
  }

  return `${trip.slug}/${getFolderDisplaySlug(folder)}/`;
}

function buildFolderButtonLabel(trip, folder) {
  if (!folder || !trip) {
    return "/";
  }

  return `${getFolderDisplaySlug(folder)}/`;
}

function buildFolderSelectLabel(tripId, folder) {
  const trip = trips.find((item) => item.id === tripId);
  if (!trip) {
    return getFolderDisplaySlug(folder);
  }

  return `${getFolderDisplaySlug(folder)}/`;
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
  const sortOrder = Number.isFinite(Number(trip?.sortOrder))
    ? Number(trip.sortOrder)
    : index;

  return {
    id: slugifyTrip(trip?.id || trip?.slug || `trip-${Date.now()}`),
    label: sanitizeUpper(trip?.label || "UNTITLED TRIP"),
    slug: slugifyTrip(trip?.slug || trip?.id || trip?.label || `trip-${Date.now()}`),
    status: String(trip?.status || "active").toLowerCase(),
    tripNumber: Number.isFinite(Number(trip?.tripNumber))
      ? Number(trip.tripNumber)
      : sortOrder + 1,
    sortOrder,
    subtitle: sanitizeUpper(trip?.subtitle || "FILE SYSTEM READY"),
    folders: Array.isArray(trip?.folders)
      ? trip.folders.map((folder) => slugifyFolder(folder))
      : undefined,
  };
}

function normalizeFolder(folder, index) {
  const slug = slugifyFolder(folder?.slug || folder?.label || folder?.id || `folder-${index}`);

  return {
    id: slug,
    slug,
    label: slug,
    kind: String(folder?.kind || classifyFolderKind(slug)).toLowerCase(),
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
    certified: Boolean(item?.certified),
    mediaDateMs: Number(item?.mediaDateMs || 0),
    mimeType,
    extension: String(item?.extension || getFileExtension(String(item?.name || ""))).toLowerCase(),
    size: Number(item?.size || 0),
    downloadURL: String(item?.downloadURL || ""),
    storagePath: String(item?.storagePath || ""),
    posterDownloadURL: String(item?.posterDownloadURL || ""),
    posterStoragePath: String(item?.posterStoragePath || ""),
    authorLabel: String(item?.authorLabel || ""),
    authorUid: String(item?.authorUid || ""),
    authorRouteId: normalizeRouteId(item?.authorRouteId),
    authorAliasMode: normalizeAuthorAliasMode(item?.authorAliasMode),
    authorGoogleName: normalizePersonName(item?.authorGoogleName),
    authorDisplayName: normalizeDisplayName(item?.authorDisplayName),
    uploadedByUid: String(item?.uploadedByUid || item?.createdByUid || ""),
    createdByEmail: String(item?.createdByEmail || ""),
    createdByUid: String(item?.createdByUid || ""),
    tripId: String(item?.tripId || ""),
    folderId: String(item?.folderId || ""),
    createdAtMs,
  };
}

function normalizeFriend(user) {
  const email = String(user?.email || "").trim().toLowerCase();
  const displayName = normalizeDisplayName(user?.displayName);
  const googleName = normalizePersonName(
    user?.googleName || user?.authName || inferNameFromEmail(email)
  );
  const role = resolveStoredUserRole(user?.role, email);

  return {
    id: String(user?.id || user?.uid || email || Date.now()),
    uid: String(user?.uid || ""),
    email,
    displayName,
    googleName,
    routeId: normalizeRouteId(user?.routeId),
    photoURL: String(user?.photoStoragePath ? user?.photoURL || "" : ""),
    photoStoragePath: String(user?.photoStoragePath || ""),
    role,
    isAdmin: isElevatedRole(role),
  };
}

function normalizeDisplayName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizePersonName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeRouteId(value) {
  const routeId = String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3);

  return /^[A-Z0-9]{3}$/.test(routeId) ? routeId : "";
}

function isValidRouteId(routeId) {
  return /^[A-Z0-9]{3}$/.test(String(routeId || ""));
}

function normalizeAuthorAliasMode(value) {
  return value === AUTHOR_ALIAS_BRAND ? AUTHOR_ALIAS_BRAND : AUTHOR_ALIAS_SELF;
}

function getFriendGoogleName(friend) {
  return normalizePersonName(friend?.googleName || inferNameFromEmail(friend?.email));
}

function getFriendLabel(friend) {
  return (
    normalizeDisplayName(friend?.displayName) ||
    getFriendGoogleName(friend) ||
    STRINGS.members.unknown
  );
}

function getFriendSecondaryLabel(friend) {
  return friend?.displayName ? getFriendGoogleName(friend) : "";
}

function buildProfilePath(routeId) {
  return routeId ? `/${normalizeRouteId(routeId)}` : "/profile";
}

function getFriendByUid(uid) {
  return friends.find((friend) => friend.uid === uid);
}

function getFriendByRouteId(routeId) {
  const normalizedRouteId = normalizeRouteId(routeId);
  return friends.find((friend) => friend.routeId === normalizedRouteId);
}

function compareFriends(left, right) {
  const leftLabel = getFriendLabel(left).toLowerCase();
  const rightLabel = getFriendLabel(right).toLowerCase();
  return leftLabel.localeCompare(rightLabel);
}

function renderFriendCard(friend, postCount = 0) {
  const label = getFriendLabel(friend);
  const badge = getRoleLabel(friend.role);
  const isCurrentUser = Boolean(currentUser?.uid && friend.uid === currentUser.uid);
  const canEditRole = isAdminViewEnabled();
  const canDeleteProfile = canEditRole && !isProtectedProfile(friend);
  const profileHref = friend.routeId ? buildProfilePath(friend.routeId) : "";
  const nameMarkup = profileHref
    ? `<a href="${escapeHtml(profileHref)}" class="truncate text-sm uppercase tracking-[0.14em] text-stone-100 transition hover:text-white xl:text-[0.78rem] xl:tracking-[0.12em] min-[1920px]:text-sm min-[1920px]:tracking-[0.14em]">${escapeHtml(label)}</a>`
    : `<p class="truncate text-sm uppercase tracking-[0.14em] text-stone-100 xl:text-[0.78rem] xl:tracking-[0.12em] min-[1920px]:text-sm min-[1920px]:tracking-[0.14em]">${escapeHtml(label)}</p>`;
  const metaLabel = `${friend.routeId ? `#${friend.routeId} / ` : ""}${buildMemberPostCountLabel(postCount)}`;
  const currentUserMarkup = isCurrentUser
    ? `<span class="border border-white/10 px-1.5 py-0.5 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.58rem] uppercase tracking-[0.18em] text-stone-300/70 xl:px-1 xl:text-[0.5rem] min-[1920px]:px-1.5 min-[1920px]:text-[0.58rem]">${STRINGS.members.you}</span>`
    : "";
  const roleMarkup = canEditRole
    ? renderFriendControls(friend, canDeleteProfile)
    : `<span class="border border-white/10 px-2 py-1 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.58rem] uppercase tracking-[0.18em] text-stone-300/75 xl:px-1.5 xl:py-0.5 xl:text-[0.52rem] min-[1920px]:px-2 min-[1920px]:py-1 min-[1920px]:text-[0.58rem]">${escapeHtml(
        badge
      )}</span>`;
  const stackedMetaMarkup = `<div class="hidden xl:flex xl:flex-wrap xl:items-center xl:gap-1.5 min-[1920px]:hidden">${currentUserMarkup}${roleMarkup}</div>`;
  const sideRoleMarkup = `<div class="shrink-0 xl:hidden min-[1920px]:block">${roleMarkup}</div>`;
  const inlineCurrentUserMarkup = `<div class="xl:hidden min-[1920px]:block">${currentUserMarkup}</div>`;

  return `
    <article class="border border-white/10 bg-black/20 px-3 py-3 xl:px-2.5 xl:py-2.5 min-[1920px]:px-3 min-[1920px]:py-3">
      <div class="flex items-start gap-3 xl:gap-2 min-[1920px]:gap-3">
        <img src="${escapeHtml(getFriendPhotoUrl(friend))}" alt="${escapeHtml(label)}" class="h-12 w-12 shrink-0 border border-white/10 bg-black object-cover object-center xl:h-9 xl:w-9 min-[1920px]:h-12 min-[1920px]:w-12">
        <div class="min-w-0 flex-1 space-y-2 xl:space-y-1.5 min-[1920px]:space-y-2">
          <div class="flex items-center gap-2">
            ${nameMarkup}
            ${inlineCurrentUserMarkup}
          </div>
          <p class="font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.62rem] uppercase tracking-[0.18em] text-stone-400/74">${escapeHtml(metaLabel)}</p>
          ${stackedMetaMarkup}
        </div>
        ${sideRoleMarkup}
      </div>
    </article>
  `;
}

function renderFriendControls(friend, canDeleteProfile) {
  return `
    <div class="flex flex-col items-start gap-2 xl:gap-1.5 min-[1920px]:gap-2">
      ${renderRoleSelect(friend)}
      ${
        canDeleteProfile
          ? `
            <button
              type="button"
              data-action="delete-profile"
              data-user-id="${escapeHtml(friend.uid || friend.id)}"
              class="border border-amber-300/32 bg-amber-100/[0.03] px-2 py-1 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.58rem] uppercase tracking-[0.18em] text-amber-100 transition hover:border-amber-200/55 hover:bg-amber-100/[0.08] xl:px-1.5 xl:py-0.5 xl:text-[0.52rem] min-[1920px]:px-2 min-[1920px]:py-1 min-[1920px]:text-[0.58rem]"
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
  const roleLocked = Boolean(friend.uid && friend.uid === currentUser?.uid);
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
      ${roleLocked ? "disabled" : ""}
      class="border border-amber-300/28 bg-amber-100/[0.04] px-2 py-2 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.58rem] uppercase tracking-[0.18em] text-amber-100 outline-none transition focus:border-amber-200/55 xl:px-1.5 xl:py-1.5 xl:text-[0.52rem] min-[1920px]:px-2 min-[1920px]:py-2 min-[1920px]:text-[0.58rem]"
    >
      ${options.join("")}
    </select>
  `;
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
    return isAdminEmail(currentUser?.email) ? ROLE_ADMIN : ROLE_FRIEND;
  }

  const currentFriend = friends.find((friend) => friend.uid === currentUser.uid);
  return currentUserProfile?.role || currentFriend?.role || resolveStoredUserRole(null, currentUser?.email);
}

function getAssignableRoles(friend) {
  return [ROLE_FRIEND, ROLE_ADMIN];
}

function resolveStoredUserRole(role, email) {
  if (isAdminEmail(email)) {
    return ROLE_ADMIN;
  }

  return normalizeUserRole(role) === ROLE_ADMIN ? ROLE_ADMIN : ROLE_FRIEND;
}

function normalizeUserRole(role) {
  const value = String(role || "").trim().toLowerCase();
  return [ROLE_FRIEND, ROLE_ADMIN].includes(value)
    ? value
    : ROLE_FRIEND;
}

function isElevatedRole(role) {
  return role === ROLE_ADMIN;
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
  setElementVisible(googleButton, visible);
  setElementVisible(bannerGoogleButton, visible, "inline-flex");
}

function setSignOutButtonsVisible(visible) {
  setElementVisible(signOutButton, visible, "flex");
  setElementVisible(bannerSignOutButton, visible, "inline-flex");
}

function setElementVisible(element, visible, displayClass = "") {
  if (!element) {
    return;
  }

  element.classList.toggle("hidden", !visible);

  if (displayClass) {
    element.classList.toggle(displayClass, visible);
  }
}

function getNextTripSortOrder() {
  return (
    trips.reduce((max, trip) => Math.max(max, Number(trip.sortOrder) || 0), -1) + 1
  );
}

function getNextTripNumber() {
  return trips.reduce((max, trip) => Math.max(max, getTripSequenceNumber(trip)), 0) + 1;
}

function getTripSequenceNumber(trip, fallbackIndex = 0) {
  if (Number.isFinite(Number(trip?.tripNumber))) {
    return Number(trip.tripNumber);
  }

  if (Number.isFinite(Number(trip?.sortOrder))) {
    return Number(trip.sortOrder) + 1;
  }

  return fallbackIndex + 1;
}

function syncLegacyTripNumbers(tripDocs) {
  if (!db || !isAdmin() || !Array.isArray(tripDocs) || tripDocs.length === 0) {
    return;
  }

  const pendingUpdates = tripDocs
    .map((tripDoc, index) => {
      const data = tripDoc.data();

      if (Number.isFinite(Number(data?.tripNumber))) {
        return null;
      }

      const normalizedTrip = normalizeTrip({ id: tripDoc.id, ...data }, index);
      return setDoc(
        doc(db, runtimeConfig.collections.trips, normalizedTrip.id),
        { tripNumber: normalizedTrip.tripNumber },
        { merge: true }
      );
    })
    .filter(Boolean);

  if (pendingUpdates.length === 0) {
    return;
  }

  Promise.all(pendingUpdates).catch((error) => {
    console.error("Could not backfill trip numbers.", error);
  });
}

function getNextFolderSortOrder(tripId) {
  return (
    getFoldersForTrip(tripId).reduce(
      (max, folder) => Math.max(max, Number(folder.sortOrder) || 0),
      -1
    ) + 1
  );
}

function getHighlightFolderSortOrder(tripId) {
  return (
    getFoldersForTrip(tripId).reduce(
      (min, folder) => Math.min(min, Number(folder.sortOrder) || 0),
      0
    ) - 1
  );
}

function upsertHighlightFolderInState(tripId) {
  if (!tripId) {
    return;
  }

  if (getFoldersForTrip(tripId).some((folder) => isHighlightFolder(folder))) {
    return;
  }

  const nextFolders = [
    ...getFoldersForTrip(tripId),
    normalizeFolder(
      {
        id: HIGHLIGHT_FOLDER_ID,
        slug: HIGHLIGHT_FOLDER_ID,
        label: HIGHLIGHT_FOLDER_LABEL,
        kind: "highlight",
        sortOrder: getHighlightFolderSortOrder(tripId),
      },
      0
    ),
  ].sort((left, right) => (Number(left.sortOrder) || 0) - (Number(right.sortOrder) || 0));

  foldersByTrip.set(tripId, nextFolders);
}

function classifyFolderKind(folderSlug) {
  if (isHighlightFolder(folderSlug)) {
    return "highlight";
  }

  return DAY_FOLDERS.includes(String(folderSlug).toLowerCase()) ? "day" : "custom";
}

function parseFolderSeeds(value) {
  const normalized = String(value || "")
    .split(",")
    .map((entry) => slugifyFolder(entry))
    .filter(Boolean);

  return [...new Set(normalized)];
}

function normalizeMediaDisplayName(value, fallbackName = "") {
  const nextValue = String(value || "")
    .trim()
    .replace(/\s+/g, " ");
  const fallback = String(fallbackName || "").trim();
  const extension = getFileExtension(fallback);

  if (!nextValue) {
    return fallback;
  }

  if (!extension || getFileExtension(nextValue)) {
    return nextValue;
  }

  return `${nextValue}.${extension}`;
}

function buildStorageFileName(file, index, preferredName = "") {
  const sourceName = normalizeMediaDisplayName(preferredName, file.name) || file.name;
  const extension = getFileExtension(sourceName);
  const safeBase = sanitizeFileBaseName(sourceName);
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

function renderFeaturedMessage() {
  if (!loadingText) {
    return;
  }

  loadingText.textContent = `> ${normalizeFeaturedMessage(featuredMessage)}`;
}

function syncFeaturedMessageForm() {
  const adminMode = isAdminViewEnabled();

  featuredMessageInput?.toggleAttribute("disabled", !adminMode);
  featuredMessageSubmit?.toggleAttribute("disabled", !adminMode);

  if (featuredMessageInput && document.activeElement !== featuredMessageInput) {
    featuredMessageInput.value = normalizeFeaturedMessage(featuredMessage);
  }
}

function normalizeFeaturedMessage(value) {
  const normalized = String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);

  return normalized || DEFAULT_FEATURED_MESSAGE;
}

function startLogoGlitchLoop() {
  if (!logo) {
    return;
  }

  const label = String(logo.textContent || "").replace(/\s+/g, " ").trim();
  logo.dataset.text = label;
  logo.classList.add("logo-glitch-loop");
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
