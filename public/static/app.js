import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  GoogleAuthProvider,
  getRedirectResult,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithRedirect,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import {
  arrayRemove,
  arrayUnion,
  collectionGroup,
  collection,
  deleteField,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
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
import {
  buildStorageFileName,
  buildUniqueStamp,
  coerceTimestampToMs,
  escapeCssSelectorToken,
  escapeHtml,
  formatBytes,
  getFileExtension,
  inferNameFromEmail,
  isValidRouteId,
  normalizeDisplayName,
  normalizeMediaDisplayName,
  normalizePersonName,
  normalizeRouteId,
  sanitizeFileBaseName,
  sanitizeUpper,
  simplifyMimeType,
  slugifyFolder,
  slugifyTrip,
} from "./modules/core/utils.js";

/**
 * Root browser composition module.
 *
 * This file still owns app state, Firebase subscriptions, event delegation, and
 * feature orchestration. New pure helpers should move into `static/modules/`;
 * see `docs/frontend-architecture.md` for the extraction plan and smoke tests.
 *
 * How to read this file:
 * - Constants, DOM references, and mutable state live first so handlers can share
 *   the same browser-owned objects without import cycles.
 * - Boot code wires copy, renders the initial shell, then starts the vault/auth
 *   flow. Firebase subscriptions fan out after config and auth are ready.
 * - Event handlers are grouped by surface: routing/mobile shell, contribution
 *   dialogs, social activity, media preview, archive actions, and profile admin.
 * - Render functions are grouped near the bottom because most handlers converge
 *   on `renderAll()` or a smaller visible-surface refresh.
 * - Pure normalizers/helpers should keep moving into `static/modules/` as this
 *   file is split into feature modules.
 */
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

// DOM cache. These IDs are owned by `index.html`; render and handler code below
// mutates them directly instead of re-querying during every refresh.
const siteShell = document.getElementById("site-shell");
const vaultGate = document.getElementById("vault-gate");
const appLoadingOverlay = document.getElementById("app-loading-overlay");
const vaultFrameCanvas = document.getElementById("vault-frame");
const vaultVideo = document.getElementById("vault-video");
const vaultOpenImage = document.getElementById("vault-open-image");
const vaultForm = document.getElementById("vault-form");
const vaultPasswordInput = document.getElementById("vault-password-input");
const vaultSubmitButton = document.getElementById("vault-submit-button");
const vaultGoogleButton = document.getElementById("vault-google-signin-button");
const vaultStatusText = document.getElementById("vault-status");
const vaultLegalModal = document.getElementById("vault-legal-modal");
const vaultLegalBackdrop = document.getElementById("vault-legal-backdrop");
const vaultLegalCloseButton = document.getElementById("vault-legal-close-button");
const vaultLegalScrollArea = document.getElementById("vault-legal-scroll-area");
const vaultLegalTriggers = Array.from(
  document.querySelectorAll("[data-vault-legal-trigger]")
);
const vaultLegalNavButtons = Array.from(
  document.querySelectorAll("[data-vault-legal-nav]")
);
const vaultLegalSections = Array.from(
  document.querySelectorAll("[data-vault-legal-section]")
);
const rootElement = document.documentElement;
const loadingText = document.getElementById("loading-text");
const logo = document.getElementById("logo");
const tripList = document.getElementById("trip-list");
const tripCount = document.getElementById("trip-count");
const clearCommentNotificationsButton = document.getElementById("clear-comment-notifications-button");
const clearFeedCommentNotificationsButton = document.getElementById("clear-feed-comment-notifications-button");
const footerTickerTrack = document.getElementById("footer-ticker-track");
const footerPrivacyLink = document.getElementById("footer-privacy-link");
const footerTosLink = document.getElementById("footer-tos-link");
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
const mobileAdminPanelsControl = document.getElementById("mobile-admin-panels-control");
const mobileAdminPanelsToggle = document.getElementById("mobile-admin-panels-toggle");
const mobileAdminPanelsToggleText = document.getElementById("mobile-admin-panels-toggle-text");
const mobileMenuMemberSummary = document.getElementById("mobile-menu-member-summary");
const mobileMenuArchiveButton = document.getElementById("mobile-menu-archive-button");
const mobileMenuProfileButton = document.getElementById("mobile-menu-profile-button");
const mobileMenuActivityButton = document.getElementById("mobile-menu-activity-button");
const mobileMenuSignOutButton = document.getElementById("mobile-menu-sign-out-button");
const mobileMenuSignInButton = document.getElementById("mobile-menu-sign-in-button");
const scrollBannerMobileMenuSlot = document.getElementById("scroll-banner-mobile-menu-slot");
const headerMobileMenuSlot = document.getElementById("header-mobile-menu-slot");
const bannerRouteToggleLink = document.getElementById("banner-route-toggle-link");
const bannerActivityButton = document.getElementById("banner-activity-button");
const bannerGoogleButton = document.getElementById("banner-google-signin-button");
const bannerSignOutButton = document.getElementById("banner-sign-out-button");
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
const desktopActivityButton = document.getElementById("desktop-activity-button");
const archivePage = document.getElementById("archive-page");
const profilePage = document.getElementById("profile-page");
const feedPage = document.getElementById("feed-page");
const membersPage = document.getElementById("members-page");
const privacyPage = document.getElementById("privacy-page");
const tosPage = document.getElementById("tos-page");
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
const profileRouteField = document.getElementById("profile-route-field");
const profileDetailsSubmit = document.getElementById("profile-details-submit");
const profileEmptyState = document.getElementById("profile-empty-state");
const profileTripList = document.getElementById("profile-trip-list");
const profileActivityForm = document.getElementById("profile-activity-form");
const profileActivityBodyInput = document.getElementById("profile-activity-body");
const profileActivityImageInput = document.getElementById("profile-activity-image");
const profileActivitySubmit = document.getElementById("profile-activity-submit");
const profileActivityStatus = document.getElementById("profile-activity-status");
const profileActivityList = document.getElementById("profile-activity-list");
const feedPageStatus = document.getElementById("feed-page-status");
const feedScopeAllInput = document.getElementById("feed-scope-all");
const feedScopeYourInput = document.getElementById("feed-scope-yours");
const feedAllCount = document.getElementById("feed-all-count");
const feedYourCount = document.getElementById("feed-your-count");
const feedAllList = document.getElementById("feed-all-list");
const membersPageStatus = document.getElementById("members-page-status");
const membersPageCount = document.getElementById("members-page-count");
const membersPageOnline = document.getElementById("members-page-online");
const membersPageList = document.getElementById("members-page-list");

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
const videoPreviewFilename = document.getElementById("video-preview-filename");
const videoPreviewAdminActions = document.getElementById("video-preview-admin-actions");
const videoPreviewSequence = document.getElementById("video-preview-sequence");
const videoPreviewBadge = document.getElementById("video-preview-badge");
const videoPreviewFrame = document.getElementById("video-preview-frame");
const videoPreviewPlayer = document.getElementById("video-preview-player");
const videoPreviewImage = document.getElementById("video-preview-image");
const videoPreviewNavigationAnchor = document.getElementById("video-preview-navigation-anchor");
const videoPreviewNavigationShell = document.getElementById("video-preview-navigation-shell");
const videoPreviewFloatingNavigation = document.getElementById("video-preview-floating-navigation");
const videoPreviewPrevButton = document.getElementById("video-preview-prev-button");
const videoPreviewNextButton = document.getElementById("video-preview-next-button");
const videoPreviewCertifyButton = document.getElementById("video-preview-certify-button");
const videoPreviewFloatingPrevButton = document.getElementById("video-preview-floating-prev-button");
const videoPreviewFloatingNextButton = document.getElementById("video-preview-floating-next-button");
const videoPreviewFloatingCertifyButton = document.getElementById("video-preview-floating-certify-button");
const videoPreviewUpNext = document.getElementById("video-preview-up-next");
const videoPreviewAutoplayToggle = document.getElementById("video-preview-autoplay-toggle");
const videoPreviewAutoplayTimerLabel = document.getElementById("video-preview-autoplay-timer");
const videoPreviewCommentForm = document.getElementById("video-preview-comment-form");
const videoPreviewCommentBodyInput = document.getElementById("video-preview-comment-body");
const videoPreviewCommentImageInput = document.getElementById("video-preview-comment-image");
const videoPreviewCommentSubmit = document.getElementById("video-preview-comment-submit");
const videoPreviewCommentStatus = document.getElementById("video-preview-comment-status");
const videoPreviewCommentsList = document.getElementById("video-preview-comments-list");
const videoPreviewSocialSummary = document.getElementById("video-preview-social-summary");
const videoPreviewLikeButton = document.getElementById("video-preview-like-button");
const videoPreviewCommentToggleButton = document.getElementById("video-preview-comment-toggle-button");
const videoPreviewThreadShell = document.getElementById("video-preview-thread-shell");
const videoPreviewThreadTitle = document.getElementById("video-preview-thread-title");
const videoPreviewThreadContext = document.getElementById("video-preview-thread-context");
const videoPreviewThreadRoot = document.getElementById("video-preview-thread-root");
const videoPreviewThreadCloseButton = document.getElementById("video-preview-thread-close-button");
const videoPreviewThreadStatus = document.getElementById("video-preview-thread-status");
const videoPreviewThreadList = document.getElementById("video-preview-thread-list");
const videoPreviewThreadForm = document.getElementById("video-preview-thread-form");
const videoPreviewThreadBodyInput = document.getElementById("video-preview-thread-body");
const videoPreviewThreadImageInput = document.getElementById("video-preview-thread-image");
const videoPreviewThreadSubmit = document.getElementById("video-preview-thread-submit");
const threadModal = document.getElementById("thread-modal");
const threadBackdrop = document.getElementById("thread-backdrop");
const threadCloseButton = document.getElementById("thread-close-button");
const threadTitle = document.getElementById("thread-title");
const threadContext = document.getElementById("thread-context");
const threadRootEntry = document.getElementById("thread-root-entry");
const threadStatus = document.getElementById("thread-status");
const threadList = document.getElementById("thread-list");
const threadForm = document.getElementById("thread-form");
const threadBodyInput = document.getElementById("thread-body");
const threadImageInput = document.getElementById("thread-image");
const threadSubmit = document.getElementById("thread-submit");
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
const featuredClipShell = document.getElementById("featured-clip-shell");
const featuredClipOpenButton = document.getElementById("featured-clip-open-button");
const featuredClipImage = document.getElementById("featured-clip-image");
const featuredClipTitle = document.getElementById("featured-clip-title");
const featuredClipContext = document.getElementById("featured-clip-context");
const featuredClipDescription = document.getElementById("featured-clip-description");

// Shared constants for roles, routes, limits, timers, and local storage keys.
const DEFAULT_PROFILE_IMAGE_URL = "/static/default-profile.svg";
const ROLE_FRIEND = "friend";
const ROLE_ADMIN = "admin";
const ROUTE_ARCHIVE = "archive";
const ROUTE_PROFILE_SELF = "profile-self";
const ROUTE_PROFILE_PUBLIC = "profile-public";
const ROUTE_FEED = "feed";
const ROUTE_MEMBERS = "members";
const ROUTE_PRIVACY = "privacy";
const ROUTE_TOS = "tos";
const ROUTE_UNKNOWN = "unknown";
const MOBILE_MENU_ROUTE_BUTTON_ACTIVE_CLASSES = [
  "border-stone-100",
  "bg-stone-100",
  "text-black",
  "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]",
];
const MOBILE_MENU_ROUTE_BUTTON_INACTIVE_CLASSES = [
  "border-white/12",
  "bg-white/[0.03]",
  "text-stone-100",
  "hover:border-white/30",
  "hover:bg-white/[0.08]",
];
const FEED_SCOPE_ALL = "all";
const FEED_SCOPE_YOURS = "yours";
const AUTHOR_ALIAS_BRAND = "brand";
const AUTHOR_ALIAS_SELF = "self";
const HIGHLIGHT_FOLDER_LABEL = String(STRINGS.brand || "100GIGZ").trim() || "100GIGZ";
const HIGHLIGHT_FOLDER_DISPLAY_LABEL = "HIGHLIGHTS";
const HIGHLIGHT_FOLDER_ID = slugifyFolder(HIGHLIGHT_FOLDER_LABEL);
const MAX_VIDEO_UPLOADS_PER_DAY = 10;
const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024;
const MAX_PROFILE_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_TRIP_COVER_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_SOCIAL_BODY_LENGTH = 600;
const AUTOPLAY_IMAGE_DURATION_MS = 3000;
const AUTOPLAY_COUNTDOWN_INTERVAL_MS = 250;
const ONLINE_WINDOW_MS = 2 * 60 * 1000;
const PRESENCE_HEARTBEAT_INTERVAL_MS = 60 * 1000;
const RECENT_MEDIA_VIEW_WINDOW_MS = 3 * 60 * 60 * 1000;
const RECENT_MEDIA_VIEW_STORAGE_KEY = "100gigz-recent-media-views";
const COMMENT_NOTIFICATION_STORAGE_KEY = "100gigz-cleared-media-comment-notifications";
const COMMENT_NOTIFICATION_HIGHLIGHT_MS = 1800;
const COMMENT_NOTIFICATION_VIEWPORT_CLEAR_MS = 1200;
const COMMENT_NOTIFICATION_FADE_MS = 360;
const GOOGLE_REDIRECT_STORAGE_KEY = "100gigz-google-redirect-requested";
const ITEM_SORT_MEDIA_DATE_DESC = "media-date-desc";
const ITEM_SORT_MEDIA_DATE_ASC = "media-date-asc";
const ITEM_SORT_RECENTLY_ADDED = "recently-added";
const ITEM_SORT_MOST_LIKES = "most-likes";
const ITEM_SORT_MOST_COMMENTS = "most-comments";
const FEATURED_MESSAGE_DOC_ID = "site-content";
const DEFAULT_FEATURED_MESSAGE = STRINGS.auth.loading;
const VAULT_LEGAL_DEFAULT_SECTION = "privacy";

// Mutable browser state. Firestore listeners replace these collections, then
// render functions read from them to keep the raw JS app predictable.
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
let vaultLegalModalOpen = false;
let threadModalOpen = false;
let contributeModalOpen = false;
let textPreviewModalOpen = false;
let currentVideoPreviewContext = null;
let pendingVideoPreviewRestoreAfterItemAction = null;
let currentItemMove = null;
let currentContributionContext = null;
let currentTextPreviewContext = null;
let currentVaultLegalSection = VAULT_LEGAL_DEFAULT_SECTION;
let lastVaultLegalTrigger = null;
let currentSocialCommentEditId = "";
let currentWallPostEditId = "";
let currentThreadReplyEditId = "";
let currentMediaCommentsKey = "";
let mediaCommentsUnsubscribe = null;
let mediaCommentsByKey = new Map();
let currentThreadSurface = "";
let currentThreadContext = null;
let currentThreadRootEntry = null;
let currentThreadStatusMessage = "";
let currentThreadRepliesKey = "";
let threadRepliesUnsubscribe = null;
let threadRepliesByKey = new Map();
let currentProfileActivityUid = "";
let profileActivityUnsubscribe = null;
let profileActivityByUser = new Map();
let profileSelectedFolders = new Map();
let feedActivityUnsubscribers = new Map();
let feedActivityEntriesByUser = new Map();
let feedReplyUnsubscribers = new Map();
let feedRepliesByThreadKey = new Map();
let feedLikeUnsubscribers = new Map();
let feedLikeEventsByTargetKey = new Map();
let feedRootActivities = [];
let feedUploadItems = [];
let feedReplyEntries = [];
let feedLikeEvents = [];
let feedActivityScope = FEED_SCOPE_ALL;
let mediaCommentAggregateUnsubscribe = null;
let threadReplyAggregateUnsubscribe = null;
let likeAggregateUnsubscribe = null;
let mediaCommentCountsByItemKey = new Map();
let mediaCommentEntriesByItemKey = new Map();
let mediaItemKeyByThreadKey = new Map();
let mediaReplyCountsByItemKey = new Map();
let replyCountsByThreadKey = new Map();
let likeActorsByTargetKey = new Map();
let interactionRefreshFrame = 0;
let commentNotificationUserUid = "";
let clearedMediaCommentNotificationKeys = new Set();
let currentVideoPreviewNotificationCommentIds = new Set();
let videoPreviewNotificationHighlightTimer = 0;
let commentNotificationViewportObserver = null;
let commentNotificationViewportSyncFrame = 0;
let commentNotificationViewportClearTimers = new Map();
let currentRoute = normalizeRoute(window.location.pathname);
let featuredMessage = DEFAULT_FEATURED_MESSAGE;
let featuredClip = null;
let videoPreviewAutoplayEnabled = false;
let videoPreviewAutoplayTimer = 0;
let videoPreviewAutoplayCountdownTimer = 0;
let videoPreviewAutoplayDeadlineMs = 0;
let videoPreviewCommentComposerOpen = false;
let videoPreviewNavigationFrame = 0;
let recentMediaViews = loadRecentMediaViews();
let presenceHeartbeatTimer = 0;
let presenceHeartbeatInFlight = false;
let googleSignInRequestInFlight = false;
let googleRedirectInProgress = false;
let googleRedirectResultPending = false;
let authStateReady = false;
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
let vaultGooglePromptBackdrop = "closed";
let tripUnsubscribe = null;
let usersUnsubscribe = null;
let siteSettingsUnsubscribe = null;
const folderUnsubscribers = new Map();

// -----------------------------------------------------------------------------
// Boot And Runtime Setup
// -----------------------------------------------------------------------------
// Initial startup is intentionally linear: apply static copy, paint placeholders,
// wire DOM events once, then let the vault/auth flow unlock Firebase-backed data.
applyStaticStrings();
renderFeaturedMessage();
syncVaultLegalNav();
startLogoGlitchLoop();
renderAll();
setupForms();
initializeVaultExperience().catch((error) => {
  const message = error instanceof Error ? error.message : STRINGS.errors.initFailed;
  setAppLoadingOverlayVisible(false);
  showWarning(message);
  setVaultStatusMessage(message.toUpperCase(), true);
});

// Writes localized/static labels into server-rendered controls. Called once
// during boot before the user can interact with auth, upload, or admin forms.
function applyStaticStrings() {
  if (authAccessLabel) {
    authAccessLabel.textContent = STRINGS.auth.access;
  }

  if (googleButton) {
    googleButton.textContent = STRINGS.auth.signInButton;
  }

  if (vaultGoogleButton) {
    vaultGoogleButton.textContent = STRINGS.auth.signInButton;
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

  if (bannerActivityButton) {
    bannerActivityButton.textContent = "Activity Feed";
  }

  if (adminPanelsToggleText) {
    adminPanelsToggleText.textContent = STRINGS.auth.showAdminPanels;
  }

  if (bannerAdminPanelsToggleText) {
    bannerAdminPanelsToggleText.textContent = STRINGS.auth.showAdminPanels;
  }

  if (mobileAdminPanelsToggleText) {
    mobileAdminPanelsToggleText.textContent = STRINGS.auth.showAdminPanels;
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

  if (mobileMenuArchiveButton) {
    mobileMenuArchiveButton.textContent = STRINGS.auth.archive;
  }

  if (mobileMenuProfileButton) {
    mobileMenuProfileButton.textContent = STRINGS.auth.profile;
  }

  if (mobileMenuActivityButton) {
    mobileMenuActivityButton.textContent = "Activity Feed";
  }

  if (desktopActivityButton) {
    desktopActivityButton.textContent = "Activity Feed";
  }

  if (mobileMenuSignOutButton) {
    mobileMenuSignOutButton.textContent = STRINGS.auth.signOutButton;
  }

  if (mobileMenuSignInButton) {
    mobileMenuSignInButton.textContent = STRINGS.auth.signInButton;
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

// Owns the entry gate before the main archive becomes interactive. It decides
// whether to show the password form, restore an unlocked session, or request
// Google sign-in, then hands off to `initializeAppOnce()`.
async function initializeVaultExperience() {
  applyVaultVideoSource(vaultState.videoPath);
  prepareVaultBackdrop();

  vaultState = await loadVaultStatus();
  applyVaultVideoSource(vaultState.videoPath);
  prepareVaultBackdrop();

  if (!vaultState.configured) {
    showVaultPasswordPrompt({
      enabled: false,
      isError: true,
      message: String(
        vaultState.message || STRINGS.errors.vaultPasswordMissingHosted
      ).toUpperCase(),
    });
    return;
  }

  if (vaultState.unlocked) {
    lockSiteShell();
    showVaultGate();
    setVaultGoogleButtonVisible(false);
    setVaultFormEnabled(false);
    setVaultFormVisible(false);
    setVaultStatusMessage("RESTORING SESSION.");
    const [initResult] = await Promise.allSettled([initializeAppOnce()]);
    if (initResult.status === "rejected") {
      const message = getErrorMessage(initResult.reason, "Initialization failed.");
      setAppLoadingOverlayVisible(false);
      routeLoadingOverlayActive = false;
      showWarning(message);
      setVaultStatusMessage(message.toUpperCase(), true);
      return;
    }

    if (await settleExistingGoogleSession()) {
      renderAll();
      return;
    }

    showVaultGooglePrompt("WELCOME, MEMBER", { focus: true, backdrop: "open" });
    renderAll();
    return;
  }

  showVaultPasswordPrompt({
    enabled: true,
    focus: true,
    message: "",
  });
}

// Ensures Firebase/config/subscriptions are initialized a single time even when
// vault unlock and auth restoration paths both race toward app startup.
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

// Loads runtime config, starts Firebase/auth listeners, and attaches the main
// Firestore streams that drive archive, member, profile, and feed rendering.
async function initialize() {
  runtimeConfig = await loadRuntimeConfig();
  firestoreReady = await initializeFirebaseIfPossible(runtimeConfig.firebaseConfig);
  storageReady = Boolean(
    runtimeConfig?.firebaseConfig?.storageBucket && firebaseApp
  );

  if (storageReady) {
    storage = getStorage(firebaseApp);
  }

  await settleGoogleRedirectResultIfNeeded();
  initializeAuthListener();
  initializeGoogleButton();
  initializeTripBrowserEvents();

  if (firestoreReady) {
    subscribeToSiteSettings();
    subscribeToTrips();
    subscribeToFriends();
    // Let the main archive/profile shell paint before attaching the sitewide aggregate listeners.
    window.requestAnimationFrame(() => {
      subscribeToInteractionAggregates();
      subscribeToFeedStreams();
    });
  } else {
    showWarning(STRINGS.errors.runtimeConfigMissing);
  }

  renderAll();
}

// Server config is fetched at runtime so the same static bundle can run across
// local, preview, and hosted environments without rebuilding `static/app.js`.
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

function hasActiveGoogleSession() {
  return Boolean(auth?.currentUser?.uid || currentUser?.uid);
}

function hasPendingGoogleRedirectResult() {
  return Boolean(
    googleRedirectResultPending ||
      window.sessionStorage?.getItem(GOOGLE_REDIRECT_STORAGE_KEY) === "1"
  );
}

function ensureAuthenticatedGoogleSession() {
  if (!vaultState.unlocked) {
    lockSiteShell();
    return false;
  }

  if (!auth || !runtimeConfig || !firestoreReady) {
    lockSiteShell();
    beginRouteLoadingOverlay();
    return false;
  }

  if (!authStateReady) {
    lockSiteShell();
    beginRouteLoadingOverlay();
    return false;
  }

  if (hasPendingGoogleRedirectResult()) {
    lockSiteShell();
    beginRouteLoadingOverlay();
    return false;
  }

  if (!hasActiveGoogleSession()) {
    showVaultGooglePrompt(
      googleSignInRequestInFlight ? "SIGNING IN WITH GOOGLE." : "WELCOME, MEMBER."
    );
    return false;
  }

  if (!vaultGate?.classList.contains("hidden")) {
    hideVaultGate();
  }
  revealSiteShell();
  return true;
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

function setVaultLegalModalOpen(nextOpen) {
  vaultLegalModalOpen = Boolean(nextOpen);

  if (!vaultLegalModal) {
    return;
  }

  vaultLegalModal.classList.toggle("hidden", !vaultLegalModalOpen);
  vaultLegalModal.classList.toggle("flex", vaultLegalModalOpen);
  vaultLegalTriggers.forEach((button) => {
    const isExpanded =
      vaultLegalModalOpen && Boolean(lastVaultLegalTrigger && button === lastVaultLegalTrigger);
    button.setAttribute("aria-expanded", String(isExpanded));
  });
}

function normalizeVaultLegalSection(section) {
  const normalizedSection = String(section || "").trim().toLowerCase();

  return vaultLegalSections.some(
    (entry) => entry.dataset.vaultLegalSection === normalizedSection
  )
    ? normalizedSection
    : VAULT_LEGAL_DEFAULT_SECTION;
}

function syncVaultLegalNav(activeSection = VAULT_LEGAL_DEFAULT_SECTION) {
  currentVaultLegalSection = normalizeVaultLegalSection(activeSection);

  vaultLegalNavButtons.forEach((button) => {
    const isActive = button.dataset.vaultLegalNav === currentVaultLegalSection;
    button.dataset.active = String(isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function scrollVaultLegalSectionIntoView(section, behavior = "smooth") {
  const targetSection = vaultLegalSections.find(
    (entry) => entry.dataset.vaultLegalSection === normalizeVaultLegalSection(section)
  );

  if (!targetSection) {
    return;
  }

  currentVaultLegalSection = targetSection.dataset.vaultLegalSection || VAULT_LEGAL_DEFAULT_SECTION;
  syncVaultLegalNav(currentVaultLegalSection);

  if (!vaultLegalScrollArea) {
    targetSection.scrollIntoView({ behavior, block: "start" });
    return;
  }

  if (behavior === "auto") {
    vaultLegalScrollArea.scrollTop = Math.max(targetSection.offsetTop - 8, 0);
    return;
  }

  vaultLegalScrollArea.scrollTo({
    top: Math.max(targetSection.offsetTop - 8, 0),
    behavior,
  });
}

function openVaultLegalModal(section, trigger = null) {
  lastVaultLegalTrigger = trigger || null;
  currentVaultLegalSection = normalizeVaultLegalSection(section);
  setVaultLegalModalOpen(true);
  syncVaultLegalNav(currentVaultLegalSection);

  window.requestAnimationFrame(() => {
    scrollVaultLegalSectionIntoView(currentVaultLegalSection, "auto");
    vaultLegalCloseButton?.focus();
  });
}

function closeVaultLegalModal({ restoreFocus = true } = {}) {
  const triggerToRestore = lastVaultLegalTrigger;
  setVaultLegalModalOpen(false);
  lastVaultLegalTrigger = null;

  if (restoreFocus) {
    triggerToRestore?.focus();
  }
}

function handleVaultLegalTriggerClick(event) {
  event.preventDefault();
  openVaultLegalModal(
    event.currentTarget?.dataset.vaultLegalTrigger,
    event.currentTarget
  );
}

function handleVaultLegalNavClick(event) {
  event.preventDefault();
  scrollVaultLegalSectionIntoView(event.currentTarget?.dataset.vaultLegalNav);
}

function setVaultFormEnabled(enabled) {
  vaultPasswordInput?.toggleAttribute("disabled", !enabled);
  vaultSubmitButton?.toggleAttribute("disabled", !enabled);
}

function setVaultFormVisible(visible) {
  setElementVisible(vaultForm, visible, "flex");
  vaultForm?.classList.toggle("opacity-0", !visible);
  vaultForm?.classList.toggle("pointer-events-none", !visible);
}

function setVaultOpenBackdropVisible(visible) {
  if (!vaultOpenImage) {
    return;
  }

  vaultOpenImage.classList.toggle("hidden", !visible);
  vaultOpenImage.classList.toggle("opacity-0", !visible);
  vaultOpenImage.classList.toggle("opacity-100", visible);
}

function setVaultGooglePromptBackdrop(mode) {
  vaultGooglePromptBackdrop = mode === "video" ? "video" : mode === "open" ? "open" : "closed";
  setVaultOpenBackdropVisible(vaultGooglePromptBackdrop === "open");
}

function setVaultGoogleButtonVisible(visible) {
  setElementVisible(vaultGoogleButton, visible, "flex");
}

function setVaultGoogleButtonEnabled(enabled) {
  vaultGoogleButton?.toggleAttribute("disabled", !enabled);
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

function shouldUseVaultKeyboardLift() {
  return Boolean(window.matchMedia?.("(max-width: 640px)").matches);
}

function resetVaultKeyboardLift() {
  rootElement.classList.remove("vault-keyboard-active");
  rootElement.style.removeProperty("--vault-keyboard-lift");
}

function updateVaultKeyboardLift() {
  if (!shouldUseVaultKeyboardLift() || document.activeElement !== vaultPasswordInput) {
    resetVaultKeyboardLift();
    return;
  }

  const layoutHeight = window.innerHeight || rootElement.clientHeight || 0;
  const visualViewport = window.visualViewport;
  const visibleBottom = visualViewport
    ? visualViewport.offsetTop + visualViewport.height
    : layoutHeight;
  const keyboardOverlap = Math.max(0, Math.round(layoutHeight - visibleBottom));
  const minimumLift = 104;
  const maximumLift = Math.max(120, Math.round(layoutHeight * 0.42));
  const lift = Math.min(maximumLift, Math.max(minimumLift, keyboardOverlap + 28));

  rootElement.style.setProperty("--vault-keyboard-lift", `${lift}px`);
  rootElement.classList.add("vault-keyboard-active");
}

function handleVaultPasswordFocus() {
  if (!shouldUseVaultKeyboardLift()) {
    return;
  }

  updateVaultKeyboardLift();
  window.setTimeout(updateVaultKeyboardLift, 80);
  window.setTimeout(updateVaultKeyboardLift, 260);
}

function showVaultPasswordPrompt({
  message = "",
  isError = false,
  enabled = true,
  focus = false,
} = {}) {
  routeLoadingOverlayActive = false;
  setAppLoadingOverlayVisible(false);
  lockSiteShell();
  showVaultGate();
  setVaultGooglePromptBackdrop("closed");
  setVaultGoogleButtonEnabled(true);
  setVaultGoogleButtonVisible(false);
  setVaultFormEnabled(enabled);
  setVaultFormVisible(true);
  setVaultStatusMessage(message, isError);

  if (focus && enabled) {
    vaultPasswordInput?.focus();
  }
}

function showVaultGooglePrompt(
  message = "WELCOME, MEMBER.",
  { isError = false, focus = false, backdrop = vaultGooglePromptBackdrop } = {}
) {
  routeLoadingOverlayActive = false;
  setAppLoadingOverlayVisible(false);
  lockSiteShell();
  showVaultGate();
  setVaultGooglePromptBackdrop(backdrop);
  setVaultFormEnabled(false);
  setVaultFormVisible(false);
  setVaultGoogleButtonEnabled(
    !googleSignInRequestInFlight &&
      !googleRedirectInProgress &&
      !hasPendingGoogleRedirectResult()
  );
  setVaultGoogleButtonVisible(true);
  setVaultStatusMessage(message, isError);

  if (focus && vaultGoogleButton && !vaultGoogleButton.hasAttribute("disabled")) {
    vaultGoogleButton.focus();
  }
}

async function handleVaultSubmit(event) {
  event.preventDefault();

  if (!vaultState.configured) {
    showVaultPasswordPrompt({
      enabled: false,
      isError: true,
      message: String(
        vaultState.message || STRINGS.errors.vaultPasswordMissingHosted
      ).toUpperCase(),
    });
    return;
  }

  const password = String(vaultPasswordInput?.value || "").trim();

  if (!password) {
    setVaultStatusMessage("ENTER PASSWORD.", true);
    vaultPasswordInput?.focus();
    return;
  }

  setVaultFormEnabled(false);
  setVaultGoogleButtonVisible(false);
  setVaultFormVisible(true);
  setVaultStatusMessage("VERIFYING PASSWORD.");

  try {
    const response = await fetch("/api/vault/verify", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      cache: "no-store",
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

    await playVaultIntro();

    const [initializeResult] = await Promise.allSettled([initializeAppOnce()]);

    if (initializeResult.status === "rejected") {
      const message = getErrorMessage(initializeResult.reason, "Initialization failed.");
      setAppLoadingOverlayVisible(false);
      routeLoadingOverlayActive = false;
      showWarning(message);
      setVaultGoogleButtonVisible(false);
      setVaultStatusMessage(message.toUpperCase(), true);
      return;
    }

    if (vaultPasswordInput) {
      vaultPasswordInput.value = "";
    }

    closeVaultLegalModal({ restoreFocus: false });

    if (await settleExistingGoogleSession()) {
      renderAll();
      return;
    }

    showVaultGooglePrompt("WELCOME, MEMBER.", { focus: true, backdrop: "video" });
    renderAll();
  } catch (error) {
    showVaultPasswordPrompt({
      enabled: true,
      isError: true,
      message: getErrorMessage(error, "Vault unlock failed.").toUpperCase(),
    });
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

  setVaultGooglePromptBackdrop("closed");
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

async function initializeFirebaseIfPossible(firebaseConfig) {
  if (!hasFirebaseConfig(firebaseConfig)) {
    return false;
  }

  firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  await setFirebaseAuthPersistence(auth);
  db = getFirestore(firebaseApp);
  return true;
}

async function setFirebaseAuthPersistence(firebaseAuth) {
  try {
    await setPersistence(firebaseAuth, browserLocalPersistence);
  } catch (error) {
    console.warn("Could not use local Firebase Auth persistence.", error);
    await setPersistence(firebaseAuth, browserSessionPersistence);
  }
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
      featuredClip = normalizeFeaturedClip(data?.featuredClip);
      renderFeaturedMessage();
      renderFeaturedClip();
      syncFeaturedMessageForm();
    },
    () => {
      featuredMessage = DEFAULT_FEATURED_MESSAGE;
      featuredClip = null;
      renderFeaturedMessage();
      renderFeaturedClip();
      syncFeaturedMessageForm();
    }
  );
}

function initializeAuthListener() {
  if (!auth) {
    return;
  }

  onAuthStateChanged(auth, async (user) => {
    authStateReady = true;
    googleSignInRequestInFlight = false;
    googleRedirectInProgress = false;
    currentUser = user;
    currentUserProfile = null;
    syncCommentNotificationUserState(user?.uid || "");

    if (user) {
      await activateAuthenticatedGoogleSession(user);
    } else {
      lockSiteShell();
      beginRouteLoadingOverlay();
      stopPresenceHeartbeat();
      friendAccessIssue = false;
      resetTextPostEditor();
      resetContributeDialog();
      resetTextPreview();
      resetItemMoveDialog();
      resetVideoPreviewThreadSelection();
      resetThreadDialog();
      resetSocialCommentEdit();
      resetWallPostEdit();
      syncVideoPreviewComments(getCurrentVideoPreviewState());
      syncProfileActivitySubscription("");
      stopFeedStreams();
      adminPanelsVisible = false;
      setMobileMenuOpen(false);
      if (currentRoute?.kind === ROUTE_PROFILE_SELF || isFeedRoute()) {
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

// -----------------------------------------------------------------------------
// Event Wiring
// -----------------------------------------------------------------------------
// One-time listener setup. Most dynamic UI uses delegated actions from this
// block because large chunks of markup are regenerated by render functions.
function setupForms() {
  vaultForm?.addEventListener("submit", handleVaultSubmit);
  vaultPasswordInput?.addEventListener("focus", handleVaultPasswordFocus);
  vaultPasswordInput?.addEventListener("blur", resetVaultKeyboardLift);
  window.visualViewport?.addEventListener("resize", updateVaultKeyboardLift);
  window.visualViewport?.addEventListener("scroll", updateVaultKeyboardLift);
  window.addEventListener("orientationchange", resetVaultKeyboardLift);
  vaultGoogleButton?.addEventListener("click", handleVaultGoogleSignIn);
  vaultLegalTriggers.forEach((button) => {
    button.addEventListener("click", handleVaultLegalTriggerClick);
  });
  vaultLegalNavButtons.forEach((button) => {
    button.addEventListener("click", handleVaultLegalNavClick);
  });
  vaultLegalCloseButton?.addEventListener("click", () => closeVaultLegalModal());
  vaultLegalBackdrop?.addEventListener("click", () => closeVaultLegalModal());
  featuredMessageForm?.addEventListener("submit", handleFeaturedMessageSubmit);
  tripForm?.addEventListener("submit", handleTripSubmit);
  folderForm?.addEventListener("submit", handleFolderSubmit);
  clearCommentNotificationsButton?.addEventListener("click", handleClearCommentNotificationsClick);
  clearFeedCommentNotificationsButton?.addEventListener("click", handleClearActivityNotificationsClick);
  uploadForm?.addEventListener("submit", handleUploadSubmit);
  textPostForm?.addEventListener("submit", handleTextPostSubmit);
  editPostForm?.addEventListener("submit", handleEditTextPostSubmit);
  moveItemForm?.addEventListener("submit", handleMoveItemSubmit);
  profileImageForm?.addEventListener("submit", handleProfileImageSubmit);
  profileDetailsForm?.addEventListener("submit", handleProfileDetailsSubmit);
  profileActivityForm?.addEventListener("submit", handleProfileActivitySubmit);
  editPostCloseButton?.addEventListener("click", resetTextPostEditor);
  editPostCancelButton?.addEventListener("click", resetTextPostEditor);
  editPostBackdrop?.addEventListener("click", resetTextPostEditor);
  moveItemCloseButton?.addEventListener("click", resetItemMoveDialog);
  moveItemCancelButton?.addEventListener("click", resetItemMoveDialog);
  moveItemBackdrop?.addEventListener("click", resetItemMoveDialog);
  videoPreviewCloseButton?.addEventListener("click", handleVideoPreviewDismissClick);
  videoPreviewBackdrop?.addEventListener("click", handleVideoPreviewDismissClick);
  videoPreviewPrevButton?.addEventListener("click", () => navigateVideoPreview(-1, { manual: true }));
  videoPreviewNextButton?.addEventListener("click", () => navigateVideoPreview(1, { manual: true }));
  videoPreviewFloatingPrevButton?.addEventListener("click", () => videoPreviewPrevButton?.click());
  videoPreviewFloatingNextButton?.addEventListener("click", () => videoPreviewNextButton?.click());
  videoPreviewFloatingCertifyButton?.addEventListener("click", () => videoPreviewCertifyButton?.click());
  videoPreviewShell?.addEventListener("scroll", scheduleVideoPreviewNavigationSync, { passive: true });
  videoPreviewAdminActions?.addEventListener("click", handleVideoPreviewAdminActionClick);
  videoPreviewCertifyButton?.addEventListener("click", handleVideoPreviewCertifiedToggleClick);
  videoPreviewAutoplayToggle?.addEventListener("change", handleVideoPreviewAutoplayToggleChange);
  videoPreviewPlayer?.addEventListener("ended", handleVideoPreviewPlayerEnded);
  videoPreviewPlayer?.addEventListener("loadedmetadata", scheduleVideoPreviewNavigationSync);
  videoPreviewImage?.addEventListener("load", scheduleVideoPreviewNavigationSync);
  videoPreviewLikeButton?.addEventListener("click", handleMediaItemLikeButtonClick);
  videoPreviewCommentToggleButton?.addEventListener("click", handleVideoPreviewCommentToggleClick);
  videoPreviewCommentForm?.addEventListener("submit", handleVideoPreviewCommentSubmit);
  videoPreviewCommentsList?.addEventListener("click", handleSocialCommentActionClick);
  videoPreviewCommentsList?.addEventListener("submit", handleSocialCommentEditSubmit);
  videoPreviewThreadRoot?.addEventListener("click", handleSocialCommentActionClick);
  videoPreviewThreadRoot?.addEventListener("submit", handleSocialCommentEditSubmit);
  videoPreviewThreadList?.addEventListener("click", handleSocialCommentActionClick);
  videoPreviewThreadList?.addEventListener("submit", handleSocialCommentEditSubmit);
  videoPreviewThreadCloseButton?.addEventListener("click", resetVideoPreviewThreadSelection);
  videoPreviewThreadForm?.addEventListener("submit", handleThreadReplySubmit);
  threadRootEntry?.addEventListener("click", handleSocialCommentActionClick);
  threadRootEntry?.addEventListener("submit", handleSocialCommentEditSubmit);
  threadList?.addEventListener("click", handleSocialCommentActionClick);
  threadList?.addEventListener("submit", handleSocialCommentEditSubmit);
  threadCloseButton?.addEventListener("click", resetThreadDialog);
  threadBackdrop?.addEventListener("click", resetThreadDialog);
  threadForm?.addEventListener("submit", handleThreadReplySubmit);
  contributeCloseButton?.addEventListener("click", resetContributeDialog);
  contributeBackdrop?.addEventListener("click", resetContributeDialog);
  contributeModal?.addEventListener("click", handleContributeModalClick);
  textPreviewCloseButton?.addEventListener("click", handleTextPreviewDismissClick);
  textPreviewBackdrop?.addEventListener("click", handleTextPreviewDismissClick);
  signOutButton?.addEventListener("click", handleSignOut);
  bannerSignOutButton?.addEventListener("click", handleSignOut);
  adminPanelsToggle?.addEventListener("change", handleAdminPanelsToggleChange);
  bannerAdminPanelsToggle?.addEventListener("change", handleAdminPanelsToggleChange);
  mobileAdminPanelsToggle?.addEventListener("change", handleAdminPanelsToggleChange);
  mobileMenuToggle?.addEventListener("click", handleMobileMenuToggleClick);
  mobileMenuBackdrop?.addEventListener("click", () => setMobileMenuOpen(false));
  mobileMenuArchiveButton?.addEventListener("click", handleMobileMenuArchiveClick);
  mobileMenuProfileButton?.addEventListener("click", handleMobileMenuProfileClick);
  mobileMenuActivityButton?.addEventListener("click", handleMobileMenuActivityClick);
  mobileMenuMemberSummary?.addEventListener("click", handleMobileMenuMemberSummaryClick);
  mobileMenuSignOutButton?.addEventListener("click", handleMobileMenuSignOutClick);
  mobileMenuSignInButton?.addEventListener("click", handleMobileMenuSignInClick);
  desktopRouteToggleLink?.addEventListener("click", handleRouteToggleClick);
  desktopActivityButton?.addEventListener("click", handleDesktopActivityClick);
  bannerRouteToggleLink?.addEventListener("click", handleRouteToggleClick);
  bannerActivityButton?.addEventListener("click", handleDesktopActivityClick);
  bannerGoogleButton?.addEventListener("click", handleGoogleSignIn);
  uploadTripSelect?.addEventListener("change", renderAdminSelects);
  textTripSelect?.addEventListener("change", renderAdminSelects);
  uploadFilesInput?.addEventListener("change", handleUploadFilesSelectionChange);
  profileRouteInput?.addEventListener("input", handleProfileRouteInput);
  profileActivityList?.addEventListener("click", handleSocialCommentActionClick);
  profileActivityList?.addEventListener("submit", handleSocialCommentEditSubmit);
  feedScopeAllInput?.addEventListener("change", handleFeedScopeChange);
  feedScopeYourInput?.addEventListener("change", handleFeedScopeChange);
  feedAllList?.addEventListener("click", handleSocialCommentActionClick);
  feedAllList?.addEventListener("submit", handleSocialCommentEditSubmit);
  profileTripList?.addEventListener("click", handleProfileTripBrowserClick);
  profileTripList?.addEventListener("change", handleProfileTripBrowserChange);
  friendsDesktopList?.addEventListener("change", handleRoleSelectChange);
  friendsMobileList?.addEventListener("change", handleRoleSelectChange);
  friendsMobileInlineList?.addEventListener("change", handleRoleSelectChange);
  membersPageList?.addEventListener("change", handleRoleSelectChange);
  friendsDesktopList?.addEventListener("click", handleProfileActionClick);
  friendsMobileList?.addEventListener("click", handleProfileActionClick);
  friendsMobileInlineList?.addEventListener("click", handleProfileActionClick);
  membersPageList?.addEventListener("click", handleProfileActionClick);
  friendsDesktopList?.addEventListener("keydown", handleProfileCardKeydown);
  friendsMobileList?.addEventListener("keydown", handleProfileCardKeydown);
  friendsMobileInlineList?.addEventListener("keydown", handleProfileCardKeydown);
  membersPageList?.addEventListener("keydown", handleProfileCardKeydown);
  featuredClipOpenButton?.addEventListener("click", handleFeaturedClipOpenClick);
  featuredClipShell?.addEventListener("click", handleFeaturedClipShellClick);
  document.addEventListener("click", handleDocumentRouteLinkClick);
  document.addEventListener("click", handleDocumentTripCollapseClick);
  document.addEventListener("visibilitychange", handlePresenceVisibilityChange);
  window.addEventListener("focus", handlePresenceFocus);
  window.addEventListener("scroll", syncScrollBannerVisibility, { passive: true });
  window.addEventListener("resize", syncResponsivePanels);
  window.addEventListener("resize", scheduleVideoPreviewNavigationSync);
  window.addEventListener("keydown", handleWindowKeydown);
  window.addEventListener("popstate", handleWindowPopstate);
  syncResponsivePanels();
  syncScrollBannerVisibility();
}

// -----------------------------------------------------------------------------
// Navigation, Routing, And Responsive Shell
// -----------------------------------------------------------------------------
// These handlers keep desktop links, the mobile menu, browser history, modals,
// and the scroll banner in sync with `currentRoute`.
function handleAdminPanelsToggleChange(event) {
  setAdminPanelsVisible(Boolean(event.target?.checked));
}

function handleMobileMenuToggleClick() {
  setMobileMenuOpen(!mobileMenuOpen);
}

function navigateFromMobileMenu(route, options = {}) {
  setMobileMenuOpen(false);
  beginRouteLoadingOverlay();
  window.requestAnimationFrame(() => {
    navigateToRoute(route, options);
  });
}

function handleMobileMenuArchiveClick() {
  navigateFromMobileMenu({ kind: ROUTE_ARCHIVE });
}

function handleMobileMenuProfileClick() {
  navigateFromMobileMenu(getOwnProfileRoute());
}

function handleMobileMenuActivityClick() {
  navigateFromMobileMenu({ kind: ROUTE_FEED });
}

function handleMobileMenuMemberSummaryClick(event) {
  const viewAllButton = event.target.closest("#mobile-menu-all-members-button");

  if (!viewAllButton) {
    return;
  }

  event.preventDefault();
  navigateFromMobileMenu({ kind: ROUTE_MEMBERS });
}

function handleDesktopActivityClick() {
  beginRouteLoadingOverlay();
  navigateToRoute({ kind: ROUTE_FEED });
}

function handleClearCommentNotificationsClick() {
  const notifications = getNewMediaNotifications();

  if (notifications.length === 0) {
    syncCommentNotificationControls();
    return;
  }

  clearMediaNotifications(notifications);

  if (authDetail) {
    authDetail.textContent = "MEDIA NOTIFICATIONS CLEARED.";
  }
}

function handleClearActivityNotificationsClick() {
  const notifications = getNewActivityNotifications();

  if (notifications.length === 0) {
    syncCommentNotificationControls();
    return;
  }

  clearActivityNotifications(notifications);

  if (authDetail) {
    authDetail.textContent = "NOTIFICATIONS CLEARED.";
  }
}

async function handleMobileMenuSignOutClick() {
  setMobileMenuOpen(false);
  await handleSignOut();
}

function handleMobileMenuSignInClick() {
  void handleGoogleSignIn();
}

function handleVideoPreviewCommentToggleClick() {
  if (!currentUser?.uid || !canUploadMedia()) {
    requestGoogleSignIn("SIGN IN TO COMMENT.");
    setVideoPreviewCommentStatus("SIGN IN TO COMMENT.");
    return;
  }

  videoPreviewCommentComposerOpen = !videoPreviewCommentComposerOpen;
  renderVideoPreviewComments(getCurrentVideoPreviewState());

  if (videoPreviewCommentComposerOpen) {
    window.requestAnimationFrame(() => {
      videoPreviewCommentBodyInput?.focus();
    });
  }
}

function handleVideoPreviewDismissClick(event) {
  event?.stopPropagation?.();
  resetVideoPreview();
}

function handleTextPreviewDismissClick(event) {
  event?.stopPropagation?.();
  resetTextPreview();
}

function handleDocumentTripCollapseClick(event) {
  if (
    isMobileTripLayout() ||
    videoPreviewModalOpen ||
    textPreviewModalOpen ||
    threadModalOpen ||
    contributeModalOpen ||
    moveItemModalOpen ||
    editPostModalOpen
  ) {
    return;
  }

  if (event.target.closest("#video-preview-modal, #text-preview-modal")) {
    return;
  }

  if (!trips.some((trip) => expandedTrips.get(trip.id))) {
    return;
  }

  if (event.target.closest("[data-trip-section='true']")) {
    return;
  }

  trips.forEach((trip) => {
    expandedTrips.set(trip.id, false);
  });
  renderTrips();
}

function handlePresenceVisibilityChange() {
  if (document.visibilityState === "visible") {
    void updatePresenceHeartbeat();
  }
}

function handlePresenceFocus() {
  void updatePresenceHeartbeat();
}

function handleWindowKeydown(event) {
  if (vaultLegalModalOpen && event.key === "Escape") {
    closeVaultLegalModal();
    return;
  }

  if (textPreviewModalOpen && event.key === "Escape") {
    resetTextPreview();
    return;
  }

  if (threadModalOpen && event.key === "Escape") {
    resetThreadDialog();
    return;
  }

  if (videoPreviewModalOpen) {
    if (event.key === "Escape") {
      resetVideoPreview();
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      navigateVideoPreview(-1, { manual: true });
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      navigateVideoPreview(1, { manual: true });
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

  if (authPanel && desktopAccessPanelSlot && authPanel.parentElement !== desktopAccessPanelSlot) {
    desktopAccessPanelSlot.appendChild(authPanel);
  }

  if (adminPanel && desktopControlPanelSlot && adminPanel.parentElement !== desktopControlPanelSlot) {
    desktopControlPanelSlot.appendChild(adminPanel);
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

function shouldRouteToggleToArchive(route = currentRoute) {
  return isProfileRoute(route) || isMembersRoute(route) || isFeedRoute(route) || isLegalRoute(route);
}

function getRouteToggleDestination(route = currentRoute) {
  return shouldRouteToggleToArchive(route) ? ROUTE_ARCHIVE : getOwnProfileRoute();
}

function handleRouteToggleClick() {
  beginRouteLoadingOverlay();
  navigateToRoute(getRouteToggleDestination());
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

  if (segment.toLowerCase() === ROUTE_MEMBERS) {
    return { kind: ROUTE_MEMBERS };
  }

  if (segment.toLowerCase() === ROUTE_FEED) {
    return { kind: ROUTE_FEED };
  }

  if (segment.toLowerCase() === ROUTE_PRIVACY) {
    return { kind: ROUTE_PRIVACY };
  }

  if (segment.toLowerCase() === ROUTE_TOS) {
    return { kind: ROUTE_TOS };
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

  if (route === ROUTE_MEMBERS || route?.kind === ROUTE_MEMBERS) {
    return { kind: ROUTE_MEMBERS };
  }

  if (route === ROUTE_FEED || route?.kind === ROUTE_FEED) {
    return { kind: ROUTE_FEED };
  }

  if (route === ROUTE_PRIVACY || route?.kind === ROUTE_PRIVACY) {
    return { kind: ROUTE_PRIVACY };
  }

  if (route === ROUTE_TOS || route?.kind === ROUTE_TOS) {
    return { kind: ROUTE_TOS };
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

  if (route?.kind === ROUTE_MEMBERS) {
    return "/members";
  }

  if (route?.kind === ROUTE_FEED) {
    return "/feed";
  }

  if (route?.kind === ROUTE_PRIVACY) {
    return "/privacy";
  }

  if (route?.kind === ROUTE_TOS) {
    return "/tos";
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

function isLegalRoute(route = currentRoute) {
  return route?.kind === ROUTE_PRIVACY || route?.kind === ROUTE_TOS;
}

function isMembersRoute(route = currentRoute) {
  return route?.kind === ROUTE_MEMBERS;
}

function isFeedRoute(route = currentRoute) {
  return route?.kind === ROUTE_FEED;
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

    if (videoPreviewModalOpen) {
      videoPreviewModal.scrollTop = 0;
      if (videoPreviewShell) {
        videoPreviewShell.scrollTop = 0;
      }
    }
  }

  syncPreviewBodyScrollLock();
  scheduleVideoPreviewNavigationSync();
}

function syncPreviewBodyScrollLock() {
  if (videoPreviewModalOpen) {
    document.body.classList.add("overflow-hidden");
    return;
  }

  if (siteShell?.getAttribute("aria-hidden") !== "true") {
    document.body.classList.remove("overflow-hidden");
  }
}

function scheduleVideoPreviewNavigationSync() {
  if (videoPreviewNavigationFrame) {
    return;
  }

  videoPreviewNavigationFrame = window.requestAnimationFrame(() => {
    videoPreviewNavigationFrame = 0;
    syncVideoPreviewNavigationPosition();
  });
}

function syncVideoPreviewNavigationPosition() {
  if (!shouldUseFloatingVideoPreviewNavigation()) {
    setFloatingVideoPreviewNavigationVisible(false);
    return;
  }

  const floatingRect = videoPreviewFloatingNavigation.getBoundingClientRect();
  const navHeight = Math.ceil(floatingRect.height || videoPreviewNavigationShell.getBoundingClientRect().height || 0);
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const anchorRect = videoPreviewNavigationAnchor.getBoundingClientRect();
  const bottomGap = 8;
  const shouldFloat = anchorRect.top > viewportHeight - navHeight - bottomGap;

  setFloatingVideoPreviewNavigationVisible(shouldFloat);
}

function shouldUseFloatingVideoPreviewNavigation() {
  return Boolean(
    videoPreviewModalOpen &&
      videoPreviewShell &&
      videoPreviewNavigationAnchor &&
      videoPreviewNavigationShell &&
      videoPreviewFloatingNavigation &&
      window.matchMedia("(max-width: 639px)").matches
  );
}

function setFloatingVideoPreviewNavigationVisible(visible) {
  if (!videoPreviewFloatingNavigation) {
    return;
  }

  videoPreviewFloatingNavigation.classList.toggle("hidden", !visible);
  videoPreviewFloatingNavigation.classList.toggle("flex", visible);
  videoPreviewFloatingNavigation.setAttribute("aria-hidden", visible ? "false" : "true");
}

function setThreadModalOpen(nextOpen) {
  threadModalOpen = Boolean(nextOpen);

  if (threadModal) {
    threadModal.classList.toggle("hidden", !threadModalOpen);
    threadModal.classList.toggle("flex", threadModalOpen);
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

// -----------------------------------------------------------------------------
// Contribution Dialogs And Text Preview
// -----------------------------------------------------------------------------
// Opens the add-to-folder modal, switches between upload/text modes, and previews
// text posts. Submit handlers for the actual writes live in the media section.
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

  const trip = trips.find((entry) => entry.id === currentContributionContext?.tripId) || null;
  const folder = getFoldersForTrip(trip?.id).find(
    (entry) => entry.id === currentContributionContext?.folderId
  ) || null;
  const existingMediaCount = trip && folder
    ? getItemsForFolder(trip.id, folder.id).filter((item) => item.kind === "file").length
    : 0;

  uploadFileNameList.innerHTML = files
    .map((file, index) => {
      const defaultName = buildDefaultUploadDisplayName(
        file,
        index,
        trip,
        existingMediaCount
      );

      return `
      <label class="block">
        <span class="mb-2 block font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.64rem] uppercase tracking-[0.18em] text-stone-400/72">File ${String(index + 1).padStart(2, "0")}</span>
        <input
          type="text"
          data-upload-file-name-index="${index}"
          maxlength="120"
          value="${escapeHtml(defaultName)}"
          class="w-full border border-white/12 bg-black/40 px-3 py-3 text-sm tracking-[0.08em] text-stone-100 outline-none transition placeholder:text-stone-400/40 focus:border-white/35"
        >
      </label>
    `;
    })
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

  if (mobileAdminPanelsControl) {
    mobileAdminPanelsControl.classList.toggle("hidden", !shouldShow);
    mobileAdminPanelsControl.classList.toggle("flex", shouldShow);
  }

  if (adminPanelsToggle) {
    adminPanelsToggle.checked = shouldShow && adminPanelsVisible;
  }

  if (bannerAdminPanelsToggle) {
    bannerAdminPanelsToggle.checked = shouldShow && adminPanelsVisible;
  }

  if (mobileAdminPanelsToggle) {
    mobileAdminPanelsToggle.checked = shouldShow && adminPanelsVisible;
  }
}

function syncDefaultAdminMode() {
  if (isAdmin()) {
    adminPanelsVisible = true;
    if (adminPanelsToggle) {
      adminPanelsToggle.checked = true;
    }
    if (mobileAdminPanelsToggle) {
      mobileAdminPanelsToggle.checked = true;
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

// -----------------------------------------------------------------------------
// Authentication, Profile Setup, And Presence
// -----------------------------------------------------------------------------
// Google sign-in, member profile creation, role resolution, and online presence
// updates live here because each flow depends on the current Firebase user.
function createGoogleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

async function waitForFirebaseAuthState() {
  if (typeof auth?.authStateReady === "function") {
    await auth.authStateReady();
  }
}

async function settleExistingGoogleSession() {
  if (!auth) {
    return false;
  }

  await waitForFirebaseAuthState();
  authStateReady = true;

  if (auth.currentUser?.uid && currentUser?.uid !== auth.currentUser.uid) {
    await activateAuthenticatedGoogleSession(auth.currentUser);
  }

  return hasActiveGoogleSession();
}

async function activateAuthenticatedGoogleSession(user) {
  const activeUser = user || auth?.currentUser;

  if (!activeUser?.uid) {
    return false;
  }

  authStateReady = true;
  googleRedirectResultPending = false;
  googleRedirectInProgress = false;
  googleSignInRequestInFlight = false;
  currentUser = activeUser;
  currentUserProfile = null;
  syncCommentNotificationUserState(activeUser.uid);
  window.sessionStorage?.removeItem(GOOGLE_REDIRECT_STORAGE_KEY);
  hideVaultGateImmediately();
  revealSiteShell();

  try {
    currentUserProfile = await syncUserRecord(activeUser);
    syncFeedActivitySubscriptions();
    startPresenceHeartbeat();
    await syncDefaultTripsIfNeeded();
  } catch (error) {
    showWarning(getErrorMessage(error, STRINGS.errors.userSyncFailed));
  }

  return true;
}

async function settleGoogleRedirectResultIfNeeded() {
  if (!auth) {
    return false;
  }

  const expectedRedirectResult =
    window.sessionStorage?.getItem(GOOGLE_REDIRECT_STORAGE_KEY) === "1";
  googleRedirectResultPending = true;
  lockSiteShell();
  beginRouteLoadingOverlay();

  try {
    const result = await getRedirectResult(auth);
    await waitForFirebaseAuthState();

    if (await activateAuthenticatedGoogleSession(result?.user || auth.currentUser)) {
      syncDefaultAdminMode();
      renderAll();
      return true;
    }
  } catch (error) {
    if (expectedRedirectResult && authDetail) {
      authDetail.textContent = getFriendlyAuthMessage(error);
    }
  } finally {
    googleRedirectResultPending = false;
    googleRedirectInProgress = false;
    googleSignInRequestInFlight = false;
    window.sessionStorage?.removeItem(GOOGLE_REDIRECT_STORAGE_KEY);
  }

  return false;
}

async function requestGoogleSignIn(message = STRINGS.auth.signingIn, options = {}) {
  const usingVaultGate = options?.surface === "vault";

  if (!auth) {
    const errorMessage = "Firebase Auth is not ready. Check the Firebase values in .env.";
    showWarning(errorMessage);
    if (usingVaultGate) {
      showVaultGooglePrompt(errorMessage.toUpperCase(), { isError: true, focus: true });
    }
    return false;
  }

  if (googleSignInRequestInFlight || googleRedirectInProgress || hasPendingGoogleRedirectResult()) {
    return false;
  }

  googleSignInRequestInFlight = true;

  try {
    if (authDetail && message) {
      authDetail.textContent = message;
    }
    if (usingVaultGate && message) {
      setVaultStatusMessage(message);
      setVaultGoogleButtonEnabled(false);
    }

    const provider = createGoogleProvider();

    if (options?.redirect) {
      googleRedirectInProgress = true;
      window.sessionStorage?.setItem(GOOGLE_REDIRECT_STORAGE_KEY, "1");
      await signInWithRedirect(auth, provider);
      return true;
    }

    const result = await signInWithPopup(auth, provider);
    await waitForFirebaseAuthState();
    if (await activateAuthenticatedGoogleSession(result?.user || auth.currentUser)) {
      syncDefaultAdminMode();
      renderAll();
      return true;
    }
  } catch (error) {
    googleRedirectInProgress = false;
    googleSignInRequestInFlight = false;
    const friendlyMessage = getFriendlyAuthMessage(error);
    if (authDetail) {
      authDetail.textContent = friendlyMessage;
    }
    if (usingVaultGate) {
      showVaultGooglePrompt(friendlyMessage, { isError: true, focus: true });
    }
    return false;
  }

  if (!options?.redirect) {
    googleSignInRequestInFlight = false;
    if (usingVaultGate && !hasActiveGoogleSession()) {
      showVaultGooglePrompt("WELCOME, MEMBER.", { focus: true });
    }
  }

  return hasActiveGoogleSession();
}

async function handleVaultGoogleSignIn() {
  googleRedirectResultPending = false;
  googleRedirectInProgress = false;
  googleSignInRequestInFlight = false;
  window.sessionStorage?.removeItem(GOOGLE_REDIRECT_STORAGE_KEY);
  await requestGoogleSignIn("SIGNING IN WITH GOOGLE.", { surface: "vault" });
}

async function handleGoogleSignIn() {
  googleRedirectResultPending = false;
  googleRedirectInProgress = false;
  googleSignInRequestInFlight = false;
  window.sessionStorage?.removeItem(GOOGLE_REDIRECT_STORAGE_KEY);
  await requestGoogleSignIn();
}

async function clearVaultSessionCookie() {
  await fetch("/api/vault/logout", {
    method: "POST",
    headers: { Accept: "application/json" },
    credentials: "same-origin",
    cache: "no-store",
  });
}

async function handleSignOut() {
  if (!window.confirm(STRINGS.auth.signOutConfirm)) {
    return;
  }

  try {
    if (auth) {
      await firebaseSignOut(auth);
    }
    authStateReady = true;
    currentUser = null;
    currentUserProfile = null;
  } catch (error) {
    if (authDetail) {
      authDetail.textContent = getErrorMessage(error, STRINGS.errors.signOutFailed);
    }
  } finally {
    try {
      await clearVaultSessionCookie();
    } catch (error) {
      console.warn("Could not clear vault session cookie.", error);
    }

    window.location.replace("/");
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

async function handleTripCoverUploadInputChange(input) {
  if (!db || !storage || !storageReady || !isAdminViewEnabled()) {
    authDetail.textContent = STRINGS.uploads.storageNotReady;
    if (input) {
      input.value = "";
    }
    return;
  }

  const tripId = String(input?.getAttribute("data-trip-id") || "");
  const file = input?.files?.[0] || null;
  const tripIndex = trips.findIndex((entry) => entry.id === tripId);
  const trip = tripIndex >= 0 ? trips[tripIndex] : null;

  if (!trip || !file) {
    return;
  }

  if (!isSupportedProfileImage(file)) {
    authDetail.textContent = STRINGS.firebase.profileImageType;
    input.value = "";
    return;
  }

  if (file.size > MAX_TRIP_COVER_IMAGE_SIZE_BYTES) {
    authDetail.textContent = STRINGS.firebase.profileImageSize;
    input.value = "";
    return;
  }

  const extension = getFileExtension(file.name) || "jpg";
  const storagePath = `trip-covers/${trip.id}/cover-${buildUniqueStamp()}.${extension}`;
  const nextImageRef = storageRef(storage, storagePath);
  const previousPath = String(trip.coverImageStoragePath || "");

  input.toggleAttribute("disabled", true);
  authDetail.textContent = `UPLOADING ${trip.slug.toUpperCase()} CARD IMAGE.`;

  try {
    const task = uploadBytesResumable(nextImageRef, file, {
      contentType: file.type || "image/jpeg",
    });

    await new Promise((resolve, reject) => {
      task.on("state_changed", null, reject, resolve);
    });

    const downloadURL = await getDownloadURL(task.snapshot.ref);

    await setDoc(
      doc(db, runtimeConfig.collections.trips, trip.id),
      {
        coverImageURL: downloadURL,
        coverImageStoragePath: storagePath,
        updatedAt: serverTimestamp(),
        updatedByUid: currentUser?.uid || "",
        updatedByEmail: currentUser?.email || "",
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

    trips = trips.map((entry, index) =>
      entry.id === trip.id
        ? normalizeTrip(
            {
              ...entry,
              coverImageURL: downloadURL,
              coverImageStoragePath: storagePath,
            },
            index
          )
        : entry
    );

    renderAll();
    authDetail.textContent = `${trip.slug.toUpperCase()} CARD IMAGE UPDATED.`;
  } catch (error) {
    authDetail.textContent = getFriendlyStorageMessage(error);
  } finally {
    input.toggleAttribute("disabled", false);
    input.value = "";
  }
}

// -----------------------------------------------------------------------------
// Social Posting, Threads, And Likes
// -----------------------------------------------------------------------------
// Creates media comments and wall posts, edits/deletes thread entries, and sends
// all like buttons through one normalized context so counters and user liked
// arrays stay in sync across media, comments, wall posts, and replies.
async function handleVideoPreviewCommentSubmit(event) {
  event.preventDefault();

  const previewState = getCurrentVideoPreviewState();
  const context = buildMediaCommentContext(previewState);

  if (!context || !db || !currentUser?.uid || !canUploadMedia()) {
    requestGoogleSignIn("SIGN IN TO COMMENT.");
    setVideoPreviewCommentStatus("SIGN IN TO COMMENT.");
    return;
  }

  const body = normalizeSocialBody(videoPreviewCommentBodyInput?.value);
  const attachmentFile = videoPreviewCommentImageInput?.files?.[0] || null;

  if (!body && !attachmentFile) {
    setVideoPreviewCommentStatus("ADD TEXT OR IMAGE.");
    return;
  }

  videoPreviewCommentSubmit?.toggleAttribute("disabled", true);
  setVideoPreviewCommentStatus("POSTING COMMENT.");

  try {
    const attachment = await uploadSocialAttachment(attachmentFile, "media-comment");
    const commentId = `comment-${buildUniqueStamp()}`;
    const actor = buildActivityActorFields();
    const createdAtMs = Date.now();
    const commentRef = doc(
      db,
      runtimeConfig.collections.trips,
      context.tripId,
      "folders",
      context.folderId,
      "items",
      context.itemId,
      "comments",
      commentId
    );
    const activityRef = doc(
      db,
      runtimeConfig.collections.users,
      currentUser.uid,
      "activity",
      commentId
    );
    const sharedFields = {
      body,
      attachmentURL: attachment.attachmentURL,
      attachmentStoragePath: attachment.attachmentStoragePath,
      attachmentMimeType: attachment.attachmentMimeType,
      attachmentName: attachment.attachmentName,
      tripId: context.tripId,
      folderId: context.folderId,
      itemId: context.itemId,
      itemName: context.itemName,
      sourceLabel: context.sourceLabel,
      createdAt: serverTimestamp(),
      createdAtMs,
      updatedAt: serverTimestamp(),
    };
    const batch = writeBatch(db);

    batch.set(commentRef, {
      id: commentId,
      type: "media-comment",
      authorUid: actor.actorUid,
      authorLabel: actor.actorLabel,
      authorRouteId: actor.actorRouteId,
      authorPhotoURL: actor.actorPhotoURL,
      ...sharedFields,
    });

    batch.set(activityRef, {
      id: commentId,
      type: "media-comment",
      actorUid: actor.actorUid,
      actorLabel: actor.actorLabel,
      actorRouteId: actor.actorRouteId,
      actorPhotoURL: actor.actorPhotoURL,
      targetUserUid: currentUser.uid,
      targetUserLabel: actor.actorLabel,
      ...sharedFields,
    });

    await batch.commit();
    syncStoredMediaItemCommentCount(context, 1);
    videoPreviewCommentForm?.reset();
    setVideoPreviewCommentStatus("COMMENT POSTED.");
  } catch (error) {
    setVideoPreviewCommentStatus(getErrorMessage(error, "Could not post comment.").toUpperCase());
  } finally {
    videoPreviewCommentSubmit?.toggleAttribute("disabled", false);
  }
}

async function handleProfileActivitySubmit(event) {
  event.preventDefault();

  const profileView = getActiveProfileView();
  const targetFriend = profileView?.state === "ready" ? profileView.friend : null;

  if (!targetFriend?.uid || !db || !currentUser?.uid || !canUploadMedia()) {
    requestGoogleSignIn("SIGN IN TO POST.");
    setProfileActivityStatus("SIGN IN TO POST.");
    return;
  }

  const body = normalizeSocialBody(profileActivityBodyInput?.value);
  const attachmentFile = profileActivityImageInput?.files?.[0] || null;

  if (!body && !attachmentFile) {
    setProfileActivityStatus("ADD TEXT OR IMAGE.");
    return;
  }

  profileActivitySubmit?.toggleAttribute("disabled", true);
  setProfileActivityStatus("POSTING TO WALL.");

  try {
    const attachment = await uploadSocialAttachment(attachmentFile, "wall-post");
    const activityId = `wall-${buildUniqueStamp()}`;
    const actor = buildActivityActorFields();
    const activityRef = doc(
      db,
      runtimeConfig.collections.users,
      targetFriend.uid,
      "activity",
      activityId
    );
    const activityDoc = {
      id: activityId,
      type: "wall-post",
      body,
      actorUid: actor.actorUid,
      actorLabel: actor.actorLabel,
      actorRouteId: actor.actorRouteId,
      actorPhotoURL: actor.actorPhotoURL,
      targetUserUid: targetFriend.uid,
      targetUserLabel: getFriendLabel(targetFriend),
      attachmentURL: attachment.attachmentURL,
      attachmentStoragePath: attachment.attachmentStoragePath,
      attachmentMimeType: attachment.attachmentMimeType,
      attachmentName: attachment.attachmentName,
      createdAt: serverTimestamp(),
      createdAtMs: Date.now(),
      updatedAt: serverTimestamp(),
    };
    const batch = writeBatch(db);

    batch.set(activityRef, activityDoc);

    if (targetFriend.uid !== currentUser.uid) {
      batch.set(
        doc(db, runtimeConfig.collections.users, currentUser.uid, "activity", activityId),
        activityDoc
      );
    }

    await batch.commit();

    profileActivityForm?.reset();
    setProfileActivityStatus("WALL POSTED.");
  } catch (error) {
    setProfileActivityStatus(getErrorMessage(error, "Could not post to wall.").toUpperCase());
  } finally {
    profileActivitySubmit?.toggleAttribute("disabled", false);
  }
}

async function handleMediaItemLikeButtonClick() {
  const context = buildMediaItemLikeContext(getCurrentVideoPreviewState());

  if (!context?.targetKey || !db || !currentUser?.uid) {
    requestGoogleSignIn("SIGN IN TO LIKE.");
    setVideoPreviewCommentStatus("SIGN IN TO LIKE.");
    return;
  }

  videoPreviewLikeButton?.toggleAttribute("disabled", true);

  try {
    const desiredLiked = !isTargetLikedByCurrentUser(context.targetKey);
    const nextLiked = await toggleLikeForContext(context, currentUser.uid, desiredLiked);
    applyLocalLikeState(context.targetKey, currentUser.uid, nextLiked);
    scheduleInteractionRefresh();
  } catch (error) {
    setVideoPreviewCommentStatus(getErrorMessage(error, "Could not update like.").toUpperCase());
  } finally {
    videoPreviewLikeButton?.toggleAttribute("disabled", false);
  }
}

function handleSocialCommentActionClick(event) {
  const threadTrigger = event.target.closest("[data-action='open-thread']");

  if (
    threadTrigger &&
    (
      threadTrigger.tagName === "BUTTON" ||
      !event.target.closest("a[href], button, input, textarea, select, label, summary, details, form")
    )
  ) {
    event.preventDefault();
    void openThreadDialog(threadTrigger);
    return;
  }

  const editWallTrigger = event.target.closest("[data-action='edit-wall-post']");

  if (editWallTrigger) {
    event.preventDefault();
    handleWallPostEditClick(editWallTrigger);
    return;
  }

  const editTrigger = event.target.closest("[data-action='edit-comment']");

  if (editTrigger) {
    event.preventDefault();
    handleSocialCommentEditClick(editTrigger);
    return;
  }

  const editReplyTrigger = event.target.closest("[data-action='edit-thread-reply']");

  if (editReplyTrigger) {
    event.preventDefault();
    handleThreadReplyEditClick(editReplyTrigger);
    return;
  }

  const cancelWallTrigger = event.target.closest("[data-action='cancel-wall-post-edit']");

  if (cancelWallTrigger) {
    event.preventDefault();
    resetWallPostEdit();
    renderVisibleSocialSurfaces();
    return;
  }

  const cancelTrigger = event.target.closest("[data-action='cancel-comment-edit']");

  if (cancelTrigger) {
    event.preventDefault();
    resetSocialCommentEdit();
    renderVisibleSocialSurfaces();
    return;
  }

  const cancelReplyTrigger = event.target.closest("[data-action='cancel-thread-reply-edit']");

  if (cancelReplyTrigger) {
    event.preventDefault();
    resetThreadReplyEdit();
    renderVisibleSocialSurfaces();
    return;
  }

  const deleteWallTrigger = event.target.closest("[data-action='delete-wall-post']");

  if (deleteWallTrigger) {
    event.preventDefault();
    void handleWallPostDeleteClick(deleteWallTrigger);
    return;
  }

  const deleteTrigger = event.target.closest("[data-action='delete-comment']");

  if (deleteTrigger) {
    event.preventDefault();
    void handleSocialCommentDeleteClick(deleteTrigger);
    return;
  }

  const deleteReplyTrigger = event.target.closest("[data-action='delete-thread-reply']");

  if (deleteReplyTrigger) {
    event.preventDefault();
    void handleThreadReplyDeleteClick(deleteReplyTrigger);
    return;
  }

  const likeTrigger = event.target.closest("[data-action='toggle-social-like']");

  if (likeTrigger) {
    event.preventDefault();
    void handleSocialLikeToggleClick(likeTrigger);
    return;
  }

  const previewThreadTrigger = event.target.closest("[data-action='open-preview-thread']");

  if (
    previewThreadTrigger &&
    (
      previewThreadTrigger.tagName === "BUTTON" ||
      !event.target.closest("a[href], button, input, textarea, select, label, summary, details, form")
    )
  ) {
    event.preventDefault();
    handleVideoPreviewThreadClick(previewThreadTrigger);
    return;
  }

  const sourceTrigger = event.target.closest("[data-action='open-activity-source']");

  if (
    sourceTrigger &&
    (
      sourceTrigger.tagName === "BUTTON" ||
      !event.target.closest("a[href], button, input, textarea, select, label, summary, details, form")
    )
  ) {
    event.preventDefault();
    void handleActivitySourceClick(sourceTrigger);
    return;
  }

}

async function handleSocialLikeToggleClick(trigger) {
  const context = readSocialLikeActionContext(trigger);

  if (!context?.targetKey || !db || !currentUser?.uid) {
    requestGoogleSignIn("SIGN IN TO LIKE.");
    setSocialSurfaceStatus("SIGN IN TO LIKE.");
    return;
  }

  if (!getSocialLikeDocRef(context, currentUser.uid)) {
    return;
  }

  trigger.disabled = true;

  try {
    const desiredLiked = !isTargetLikedByCurrentUser(context.targetKey);
    const nextLiked = await toggleLikeForContext(context, currentUser.uid, desiredLiked);
    applyLocalLikeState(context.targetKey, currentUser.uid, nextLiked);
    scheduleInteractionRefresh();
  } catch (error) {
    setSocialSurfaceStatus(getErrorMessage(error, "Could not update like.").toUpperCase());
    trigger.disabled = false;
  }
}

function handleSocialCommentEditClick(trigger) {
  const context = readSocialCommentActionContext(trigger);

  if (!context?.commentId || !canEditSocialCommentContext(context)) {
    return;
  }

  resetThreadReplyEdit();
  resetWallPostEdit();
  currentSocialCommentEditId = context.commentId;
  renderVisibleSocialSurfaces();
}

async function handleSocialCommentEditSubmit(event) {
  const replyForm = event.target.closest("[data-action='save-thread-reply-edit']");

  if (replyForm) {
    event.preventDefault();
    await handleThreadReplyEditSubmit(replyForm);
    return;
  }

  const wallPostForm = event.target.closest("[data-action='save-wall-post-edit']");

  if (wallPostForm) {
    event.preventDefault();
    await handleWallPostEditSubmit(wallPostForm);
    return;
  }

  const form = event.target.closest("[data-action='save-comment-edit']");

  if (!form) {
    return;
  }

  event.preventDefault();

  const context = readSocialCommentActionContext(form);

  if (!context?.commentId || !canEditSocialCommentContext(context) || !db) {
    return;
  }

  const bodyInput = form.querySelector("textarea[name='commentBody']");
  const body = normalizeSocialBody(bodyInput?.value);

  if (!body && !context.hasAttachment) {
    setSocialSurfaceStatus("COMMENT NEEDS TEXT OR IMAGE.");
    return;
  }

  const submitButton = form.querySelector("button[type='submit']");
  submitButton?.toggleAttribute("disabled", true);
  setSocialSurfaceStatus("SAVING COMMENT.");

  try {
    await updateSocialCommentBody(context, body);
    resetSocialCommentEdit();
    setSocialSurfaceStatus("COMMENT UPDATED.");
  } catch (error) {
    setSocialSurfaceStatus(getErrorMessage(error, "Could not update comment.").toUpperCase());
  } finally {
    submitButton?.toggleAttribute("disabled", false);
  }
}

function handleWallPostEditClick(trigger) {
  const context = readWallPostActionContext(trigger);

  if (!context?.activityId || !canEditWallPostContext(context)) {
    return;
  }

  resetThreadReplyEdit();
  resetSocialCommentEdit();
  currentWallPostEditId = context.activityId;
  renderVisibleSocialSurfaces();
}

function handleThreadReplyEditClick(trigger) {
  const context = readThreadReplyActionContext(trigger);

  if (!context?.replyId || !canEditThreadReplyContext(context)) {
    return;
  }

  resetSocialCommentEdit();
  resetWallPostEdit();
  currentThreadReplyEditId = context.replyId;
  renderVisibleSocialSurfaces();
}

async function handleWallPostEditSubmit(form) {
  const context = readWallPostActionContext(form);

  if (!context?.activityId || !canEditWallPostContext(context) || !db) {
    return;
  }

  const bodyInput = form.querySelector("textarea[name='wallPostBody']");
  const body = normalizeSocialBody(bodyInput?.value);

  if (!body && !context.hasAttachment) {
    setSocialSurfaceStatus("POST NEEDS TEXT OR IMAGE.");
    return;
  }

  const submitButton = form.querySelector("button[type='submit']");
  submitButton?.toggleAttribute("disabled", true);
  setSocialSurfaceStatus("SAVING WALL POST.");

  try {
    await updateWallPostBody(context, body);
    resetWallPostEdit();
    setSocialSurfaceStatus("WALL POST UPDATED.");
  } catch (error) {
    setSocialSurfaceStatus(getErrorMessage(error, "Could not update wall post.").toUpperCase());
  } finally {
    submitButton?.toggleAttribute("disabled", false);
  }
}

async function handleSocialCommentDeleteClick(trigger) {
  const context = readSocialCommentActionContext(trigger);

  if (!context?.commentId || !canDeleteSocialCommentContext(context) || !db) {
    return;
  }

  const confirmed = window.confirm("Delete this comment everywhere it appears?");

  if (!confirmed) {
    return;
  }

  trigger.disabled = true;
  setSocialSurfaceStatus("DELETING COMMENT.");

  try {
    await deleteSocialComment(context);
    if (currentSocialCommentEditId === context.commentId) {
      resetSocialCommentEdit();
    }
    setSocialSurfaceStatus("COMMENT DELETED.");
  } catch (error) {
    setSocialSurfaceStatus(getErrorMessage(error, "Could not delete comment.").toUpperCase());
    trigger.disabled = false;
  }
}

async function handleWallPostDeleteClick(trigger) {
  const context = readWallPostActionContext(trigger);

  if (!context?.activityId || !canDeleteWallPostContext(context) || !db) {
    return;
  }

  const confirmed = window.confirm("Delete this wall post everywhere it appears?");

  if (!confirmed) {
    return;
  }

  trigger.disabled = true;
  setSocialSurfaceStatus("DELETING WALL POST.");

  try {
    await deleteWallPost(context);
    if (currentWallPostEditId === context.activityId) {
      resetWallPostEdit();
    }
    setSocialSurfaceStatus("WALL POST DELETED.");
  } catch (error) {
    setSocialSurfaceStatus(getErrorMessage(error, "Could not delete wall post.").toUpperCase());
    trigger.disabled = false;
  }
}

async function handleThreadReplyEditSubmit(form) {
  const context = readThreadReplyActionContext(form);

  if (!context?.replyId || !canEditThreadReplyContext(context) || !db) {
    return;
  }

  const bodyInput = form.querySelector("textarea[name='threadReplyBody']");
  const body = normalizeSocialBody(bodyInput?.value);

  if (!body && !context.hasAttachment) {
    setSocialSurfaceStatus("REPLY NEEDS TEXT OR IMAGE.");
    return;
  }

  const submitButton = form.querySelector("button[type='submit']");
  submitButton?.toggleAttribute("disabled", true);
  setSocialSurfaceStatus("SAVING REPLY.");

  try {
    await updateThreadReplyBody(context, body);
    resetThreadReplyEdit();
    setSocialSurfaceStatus("REPLY UPDATED.");
  } catch (error) {
    setSocialSurfaceStatus(getErrorMessage(error, "Could not update reply.").toUpperCase());
  } finally {
    submitButton?.toggleAttribute("disabled", false);
  }
}

async function handleThreadReplyDeleteClick(trigger) {
  const context = readThreadReplyActionContext(trigger);

  if (!context?.replyId || !canDeleteThreadReplyContext(context) || !db) {
    return;
  }

  const confirmed = window.confirm("Delete this reply everywhere it appears?");

  if (!confirmed) {
    return;
  }

  trigger.disabled = true;
  setSocialSurfaceStatus("DELETING REPLY.");

  try {
    await deleteThreadReply(context);
    if (currentThreadReplyEditId === context.replyId) {
      resetThreadReplyEdit();
    }
    setSocialSurfaceStatus("REPLY DELETED.");
  } catch (error) {
    setSocialSurfaceStatus(getErrorMessage(error, "Could not delete reply.").toUpperCase());
    trigger.disabled = false;
  }
}

function handleVideoPreviewThreadClick(trigger) {
  const context = readThreadActionContext(trigger);
  const previewState = getCurrentVideoPreviewState();

  if (!context?.activityId || !previewState || !currentVideoPreviewContext) {
    return;
  }

  const currentThreadId = String(previewState.threadCommentId || "");
  const currentThreadOwnerUid = String(previewState.threadOwnerUid || "");

  if (
    currentThreadId === context.activityId &&
    currentThreadOwnerUid === String(context.threadOwnerUid || "")
  ) {
    resetVideoPreviewThreadSelection();
    return;
  }

  currentVideoPreviewContext.threadCommentId = context.activityId;
  currentVideoPreviewContext.threadOwnerUid = String(context.threadOwnerUid || "");
  syncActiveVideoPreviewThread(getCurrentVideoPreviewState());
  renderVideoPreviewComments(getCurrentVideoPreviewState());
}

async function handleActivitySourceClick(trigger) {
  const context = readActivitySourceContext(trigger);
  const threadContext = readThreadActionContext(trigger);

  if (!context?.tripId || !context.folderId || !context.itemId) {
    return;
  }

  const item = await resolveActivitySourceItem(context);

  if (!item) {
    setSocialSurfaceStatus("SOURCE ITEM NO LONGER EXISTS.");
    return;
  }

  if (item.kind === "text") {
    openTextPreview(context.tripId, context.folderId, context.itemId);
    return;
  }

  if (isPreviewableMediaItem(item)) {
    openVideoPreview(context.tripId, context.folderId, context.itemId, "archive", {
      threadCommentId: threadContext?.activityId || "",
      threadOwnerUid: threadContext?.threadOwnerUid || "",
    });
    if (threadContext?.activityId) {
      schedulePreviewCommentHighlight(threadContext.activityId);
    }
    return;
  }

  setSocialSurfaceStatus("SOURCE ITEM CAN'T BE PREVIEWED.");
}

async function resolveActivitySourceItem(context) {
  const getCurrentItem = () =>
    getItemsForFolder(context.tripId, context.folderId).find(
      (item) => item.id === context.itemId
    ) || null;

  let item = getCurrentItem();

  if (item || !db) {
    return item;
  }

  try {
    await loadFolderItems(context.tripId, context.folderId);
  } catch (error) {
    console.warn("Could not load activity source item.", error);
  }

  item = getCurrentItem();
  return item;
}

function schedulePreviewCommentHighlight(activityId) {
  const targetId = String(activityId || "");

  if (!targetId) {
    return;
  }

  let attempts = 0;
  const escapedTargetId = window.CSS?.escape ? window.CSS.escape(targetId) : targetId.replace(/"/g, '\\"');
  const selector = `[data-thread-root-entry="${escapedTargetId}"], [data-media-comment-id="${escapedTargetId}"]`;

  const highlightWhenReady = () => {
    attempts += 1;
    const target = videoPreviewShell?.querySelector(selector);

    if (!target && attempts < 12) {
      window.setTimeout(highlightWhenReady, 120);
      return;
    }

    if (!target) {
      return;
    }

    target.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
    target.style.transition = "border-color 180ms ease, background-color 180ms ease, box-shadow 180ms ease";
    target.style.borderColor = "rgba(186,230,253,0.68)";
    target.style.backgroundColor = "rgba(186,230,253,0.08)";
    target.style.boxShadow = "0 0 0 1px rgba(186,230,253,0.22), 0 0 28px rgba(125,211,252,0.14)";

    window.setTimeout(() => {
      target.style.borderColor = "";
      target.style.backgroundColor = "";
      target.style.boxShadow = "";
    }, 1800);
  };

  window.requestAnimationFrame(highlightWhenReady);
}

async function openThreadDialog(trigger) {
  const context = readThreadActionContext(trigger);

  if (!context?.threadOwnerUid || !context?.activityId || !db) {
    return;
  }

  const threadKey = buildThreadKey(context.threadOwnerUid, context.activityId);
  currentThreadSurface = "modal";
  currentThreadContext = context;
  currentThreadRootEntry = null;
  threadRepliesUnsubscribe?.();
  threadRepliesUnsubscribe = null;
  currentThreadRepliesKey = "";
  threadForm?.reset();
  setThreadStatusMessage("LOADING THREAD.");
  setThreadModalOpen(true);
  renderThreadDialog();

  try {
    const threadSnapshot = await getDoc(
      getActivityDocRef(context.threadOwnerUid, context.activityId)
    );

    if (buildThreadKey(currentThreadContext?.threadOwnerUid, currentThreadContext?.activityId) !== threadKey) {
      return;
    }

    if (!threadSnapshot.exists()) {
      throw new Error("Thread no longer exists.");
    }

    currentThreadRootEntry = normalizeThreadRootEntry({
      id: threadSnapshot.id,
      ...threadSnapshot.data(),
    });
    syncThreadRepliesSubscription();
    renderThreadDialog();
  } catch (error) {
    currentThreadRootEntry = null;
    setThreadStatusMessage(getErrorMessage(error, "Could not load thread.").toUpperCase());
    renderThreadDialog();
  }
}

function getThreadReplyComposer(form) {
  const isPreviewComposer = form === videoPreviewThreadForm;

  return {
    form,
    bodyInput: isPreviewComposer ? videoPreviewThreadBodyInput : threadBodyInput,
    imageInput: isPreviewComposer ? videoPreviewThreadImageInput : threadImageInput,
    submitButton: isPreviewComposer ? videoPreviewThreadSubmit : threadSubmit,
  };
}

async function handleThreadReplySubmit(event) {
  event.preventDefault();

  const form = event.target.closest("form");
  const composer = form ? getThreadReplyComposer(form) : null;

  if (
    !composer ||
    !db ||
    !currentUser?.uid ||
    !currentThreadContext ||
    !currentThreadRootEntry ||
    !canUploadMedia()
  ) {
    requestGoogleSignIn("SIGN IN TO REPLY.");
    setThreadStatusMessage("SIGN IN TO REPLY.");
    return;
  }

  const body = normalizeSocialBody(composer.bodyInput?.value);
  const attachmentFile = composer.imageInput?.files?.[0] || null;

  if (!body && !attachmentFile) {
    setThreadStatusMessage("ADD TEXT OR IMAGE.");
    return;
  }

  composer.submitButton?.toggleAttribute("disabled", true);
  setThreadStatusMessage("POSTING REPLY.");

  try {
    const attachment = await uploadSocialAttachment(attachmentFile, "thread-reply");
    const actor = buildActivityActorFields();
    const replyId = `reply-${buildUniqueStamp()}`;
    const createdAtMs = Date.now();

    await setDoc(
      doc(
        db,
        runtimeConfig.collections.users,
        currentThreadContext.threadOwnerUid,
        "activity",
        currentThreadContext.activityId,
        "replies",
        replyId
      ),
      {
        id: replyId,
        type: "thread-reply",
        parentType: currentThreadRootEntry.type,
        body,
        attachmentURL: attachment.attachmentURL,
        attachmentStoragePath: attachment.attachmentStoragePath,
        attachmentMimeType: attachment.attachmentMimeType,
        attachmentName: attachment.attachmentName,
        actorUid: actor.actorUid,
        actorLabel: actor.actorLabel,
        actorRouteId: actor.actorRouteId,
        actorPhotoURL: actor.actorPhotoURL,
        createdAt: serverTimestamp(),
        createdAtMs,
        updatedAt: serverTimestamp(),
        updatedAtMs: createdAtMs,
      }
    );

    composer.form?.reset();
    setThreadStatusMessage("REPLY POSTED.");
  } catch (error) {
    setThreadStatusMessage(getErrorMessage(error, "Could not post reply.").toUpperCase());
  } finally {
    composer.submitButton?.toggleAttribute("disabled", false);
  }
}

async function updateSocialCommentBody(context, body) {
  const commentRef = getMediaCommentDocRef(context);
  const activityUserId = context.activityUserId || context.authorUid || currentUser?.uid || "";
  const activityRef = activityUserId ? getActivityDocRef(activityUserId, context.commentId) : null;
  const [commentSnapshot, activitySnapshot] = await Promise.all([
    getDoc(commentRef),
    activityRef ? getDoc(activityRef) : Promise.resolve(null),
  ]);

  if (!commentSnapshot.exists()) {
    throw new Error("Comment no longer exists.");
  }

  const nowMs = Date.now();
  const patch = {
    body,
    editedAt: serverTimestamp(),
    editedAtMs: nowMs,
    updatedAt: serverTimestamp(),
    updatedAtMs: nowMs,
  };
  const batch = writeBatch(db);

  batch.set(commentRef, patch, { merge: true });

  if (activityRef && activitySnapshot?.exists()) {
    batch.set(activityRef, patch, { merge: true });
  }

  await batch.commit();
}

async function updateWallPostBody(context, body) {
  const wallPostRefs = getWallPostDocRefs(context);

  if (wallPostRefs.length === 0) {
    throw new Error("Wall post is missing.");
  }

  const snapshots = await Promise.all(wallPostRefs.map((ref) => getDoc(ref)));

  if (!snapshots.some((snapshot) => snapshot.exists())) {
    throw new Error("Wall post no longer exists.");
  }

  const nowMs = Date.now();
  const patch = {
    body,
    editedAt: serverTimestamp(),
    editedAtMs: nowMs,
    updatedAt: serverTimestamp(),
    updatedAtMs: nowMs,
  };
  const batch = writeBatch(db);

  snapshots.forEach((snapshot, index) => {
    if (snapshot.exists()) {
      batch.set(wallPostRefs[index], patch, { merge: true });
    }
  });

  await batch.commit();
}

async function updateThreadReplyBody(context, body) {
  const replyRef = getThreadReplyDocRef(context);

  if (!replyRef) {
    throw new Error("Reply is missing.");
  }

  const replySnapshot = await getDoc(replyRef);

  if (!replySnapshot.exists()) {
    throw new Error("Reply no longer exists.");
  }

  const nowMs = Date.now();
  await setDoc(
    replyRef,
    {
      body,
      editedAt: serverTimestamp(),
      editedAtMs: nowMs,
      updatedAt: serverTimestamp(),
      updatedAtMs: nowMs,
    },
    { merge: true }
  );
}

async function deleteSocialComment(context) {
  const commentRef = getMediaCommentDocRef(context);
  const activityUserId = context.activityUserId || context.authorUid || currentUser?.uid || "";
  const activityRef = activityUserId ? getActivityDocRef(activityUserId, context.commentId) : null;
  const threadContext = {
    threadOwnerUid: activityUserId,
    activityId: context.commentId,
  };
  const [commentSnapshot, activitySnapshot] = await Promise.all([
    getDoc(commentRef),
    activityRef ? getDoc(activityRef) : Promise.resolve(null),
  ]);
  const commentLikeDocs = await collectChildDocs(commentRef, "likes");
  const threadReplyDeletePlan = await collectThreadReplyDeletePlan(threadContext);
  const batch = writeBatch(db);

  if (commentSnapshot.exists()) {
    batch.delete(commentRef);
  }

  if (activityRef && activitySnapshot?.exists()) {
    batch.delete(activityRef);
  }

  commentLikeDocs.forEach((likeDoc) => {
    batch.delete(likeDoc.ref);
  });

  threadReplyDeletePlan.replyDocs.forEach((replyDoc) => {
    batch.delete(replyDoc.ref);
  });

  threadReplyDeletePlan.likeDocs.forEach((likeDoc) => {
    batch.delete(likeDoc.ref);
  });

  await batch.commit();
  syncStoredMediaItemCommentCount(context, -1);

  try {
    await deleteSocialAttachmentIfPossible(context.attachmentStoragePath);
    await deleteSocialAttachmentPaths(threadReplyDeletePlan.attachmentPaths);
  } catch (error) {
    console.warn("Could not delete social attachment.", error);
  }

  resetActiveThreadForContext(threadContext);
}

async function deleteWallPost(context) {
  const wallPostRefs = getWallPostDocRefs(context);
  const threadContext = {
    threadOwnerUid: context.targetUserUid,
    activityId: context.activityId,
  };

  if (wallPostRefs.length === 0) {
    throw new Error("Wall post is missing.");
  }

  const snapshots = await Promise.all(wallPostRefs.map((ref) => getDoc(ref)));
  const wallPostLikeParentRef = context.targetUserUid && context.activityId
    ? getActivityDocRef(context.targetUserUid, context.activityId)
    : null;
  const wallPostLikeDocs = await collectChildDocs(
    wallPostLikeParentRef,
    "likes"
  );
  const threadReplyDeletePlan = await collectThreadReplyDeletePlan(threadContext);
  const batch = writeBatch(db);
  let hasExistingWallPost = false;

  snapshots.forEach((snapshot, index) => {
    if (snapshot.exists()) {
      batch.delete(wallPostRefs[index]);
      hasExistingWallPost = true;
    }
  });

  threadReplyDeletePlan.replyDocs.forEach((replyDoc) => {
    batch.delete(replyDoc.ref);
  });

  wallPostLikeDocs.forEach((likeDoc) => {
    batch.delete(likeDoc.ref);
  });

  threadReplyDeletePlan.likeDocs.forEach((likeDoc) => {
    batch.delete(likeDoc.ref);
  });

  if (!hasExistingWallPost) {
    throw new Error("Wall post no longer exists.");
  }

  await batch.commit();

  try {
    await deleteSocialAttachmentIfPossible(context.attachmentStoragePath);
    await deleteSocialAttachmentPaths(threadReplyDeletePlan.attachmentPaths);
  } catch (error) {
    console.warn("Could not delete social attachment.", error);
  }

  resetActiveThreadForContext(threadContext);
}

function syncStoredMediaItemCommentCount(context, delta) {
  void updateStoredMediaItemCommentCount(context, delta).catch((error) => {
    console.warn("Could not update media item comment count.", error);
  });
}

async function updateStoredMediaItemCommentCount(context, delta) {
  if (!db || !context?.tripId || !context?.folderId || !context?.itemId || !delta) {
    return;
  }

  const itemRef = getMediaItemDocRef(context);

  if (delta > 0) {
    await updateDoc(itemRef, { commentCount: increment(delta) });
    return;
  }

  const itemSnapshot = await getDoc(itemRef);

  if (!itemSnapshot.exists()) {
    return;
  }

  const currentCommentCount = Math.max(Number(itemSnapshot.data()?.commentCount || 0), 0);
  await updateDoc(itemRef, { commentCount: Math.max(currentCommentCount + delta, 0) });
}

async function deleteThreadReply(context) {
  const replyRef = getThreadReplyDocRef(context);

  if (!replyRef) {
    throw new Error("Reply is missing.");
  }

  const [replySnapshot, replyLikeDocs] = await Promise.all([
    getDoc(replyRef),
    collectChildDocs(replyRef, "likes"),
  ]);

  if (!replySnapshot.exists()) {
    throw new Error("Reply no longer exists.");
  }

  const batch = writeBatch(db);
  batch.delete(replyRef);
  replyLikeDocs.forEach((likeDoc) => {
    batch.delete(likeDoc.ref);
  });
  await batch.commit();

  try {
    await deleteSocialAttachmentIfPossible(context.attachmentStoragePath);
  } catch (error) {
    console.warn("Could not delete social attachment.", error);
  }
}

async function collectChildDocs(parentRef, childCollectionName) {
  if (!parentRef || !childCollectionName) {
    return [];
  }

  const snapshot = await getDocs(collection(parentRef, childCollectionName));
  return snapshot.docs;
}

async function collectThreadReplyDeletePlan(context) {
  if (!db || !runtimeConfig?.collections?.users || !context?.threadOwnerUid || !context?.activityId) {
    return {
      replyDocs: [],
      likeDocs: [],
      attachmentPaths: [],
    };
  }

  const repliesSnapshot = await getDocs(
    collection(
      db,
      runtimeConfig.collections.users,
      context.threadOwnerUid,
      "activity",
      context.activityId,
      "replies"
    )
  );

  const replyLikeDocs = (
    await Promise.all(
      repliesSnapshot.docs.map((replyDoc) => collectChildDocs(replyDoc.ref, "likes"))
    )
  ).flat();

  return {
    replyDocs: repliesSnapshot.docs,
    likeDocs: replyLikeDocs,
    attachmentPaths: repliesSnapshot.docs
      .map((replyDoc) => String(replyDoc.data()?.attachmentStoragePath || ""))
      .filter(Boolean),
  };
}

async function deleteSocialAttachmentPaths(paths) {
  const uniquePaths = [...new Set((paths || []).filter(Boolean))];

  for (const storagePath of uniquePaths) {
    await deleteSocialAttachmentIfPossible(storagePath);
  }
}

async function deleteSocialAttachmentIfPossible(storagePath) {
  if (!storage || !storagePath) {
    return;
  }

  try {
    await deleteObject(storageRef(storage, storagePath));
  } catch (error) {
    if (!isStorageObjectMissing(error)) {
      throw error;
    }
  }
}

// -----------------------------------------------------------------------------
// Firestore Subscriptions And Activity Streams
// -----------------------------------------------------------------------------
// Live Firestore snapshots hydrate the in-memory state maps. The feed is built
// from user activity docs, reply subcollections, upload items, and like docs.
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
      syncFeedActivitySubscriptions();
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

function subscribeToInteractionAggregates() {
  if (!db) {
    return;
  }

  subscribeToMediaCommentAggregates();
  subscribeToThreadReplyAggregates();
  subscribeToLikeAggregates();
}

function subscribeToFeedStreams() {
  if (!db || !runtimeConfig?.collections?.users) {
    return;
  }

  syncFeedActivitySubscriptions();
}

function syncFeedActivitySubscriptions() {
  if (!db || !runtimeConfig?.collections?.users || !currentUser?.uid) {
    stopFeedStreams();
    return;
  }

  // All Activity watches every visible member's root activity collection. Your
  // Activity later filters the combined stream down to entries relevant to the
  // signed-in user.
  const desiredUids = new Set(
    getVisibleMembers()
      .map((friend) => String(friend.uid || friend.id || ""))
      .filter(Boolean)
  );
  desiredUids.add(currentUser.uid);

  feedActivityUnsubscribers.forEach((unsubscribe, uid) => {
    if (!desiredUids.has(uid)) {
      unsubscribe();
      feedActivityUnsubscribers.delete(uid);
      feedActivityEntriesByUser.delete(uid);
    }
  });

  desiredUids.forEach((uid) => {
    if (feedActivityUnsubscribers.has(uid)) {
      return;
    }

    const activityQuery = query(
      collection(db, runtimeConfig.collections.users, uid, "activity"),
      orderBy("createdAtMs", "desc")
    );
    const unsubscribe = onSnapshot(
      activityQuery,
      (snapshot) => {
        feedActivityEntriesByUser.set(
          uid,
          snapshot.docs.map((activityDoc) =>
            normalizeActivityEntry({
              id: activityDoc.id,
              activityOwnerUid: uid,
              ...activityDoc.data(),
            })
          )
        );
        rebuildFeedRootActivitiesFromUserStreams();
        syncFeedReplySubscriptions();
        scheduleInteractionRefresh();
        renderFeedPageIfVisible();
      },
      (error) => {
        console.warn("Could not subscribe to feed activity.", error);
        setFeedStatus(getFriendlyFirestoreMessage(error).toUpperCase());
      }
    );

    feedActivityUnsubscribers.set(uid, unsubscribe);
  });

  rebuildFeedRootActivitiesFromUserStreams();
  syncFeedReplySubscriptions();
}

function rebuildFeedRootActivitiesFromUserStreams() {
  feedRootActivities = [...feedActivityEntriesByUser.values()]
    .flat()
    .sort(compareFeedEntriesByTime);
}

function syncFeedReplySubscriptions() {
  if (!db || !runtimeConfig?.collections?.users || !currentUser?.uid) {
    return;
  }

  // Replies stay out of All Activity, but the feed still watches them for reply
  // counters and Your Activity notifications.
  const desiredThreads = new Map();

  getUniqueFeedRootActivities()
    .slice(0, 160)
    .forEach((entry) => {
      const threadOwnerUid = getThreadOwnerUid(entry);
      const activityId = String(entry?.id || "");
      const threadKey = buildThreadKey(threadOwnerUid, activityId);

      if (threadKey) {
        desiredThreads.set(threadKey, { threadOwnerUid, activityId });
      }
    });

  feedReplyUnsubscribers.forEach((unsubscribe, threadKey) => {
    if (!desiredThreads.has(threadKey)) {
      unsubscribe();
      feedReplyUnsubscribers.delete(threadKey);
      feedRepliesByThreadKey.delete(threadKey);
    }
  });

  desiredThreads.forEach((context, threadKey) => {
    if (feedReplyUnsubscribers.has(threadKey)) {
      return;
    }

    const repliesQuery = query(
      collection(
        db,
        runtimeConfig.collections.users,
        context.threadOwnerUid,
        "activity",
        context.activityId,
        "replies"
      ),
      orderBy("createdAtMs", "asc")
    );
    const unsubscribe = onSnapshot(
      repliesQuery,
      (snapshot) => {
        feedRepliesByThreadKey.set(
          threadKey,
          snapshot.docs.map((replyDoc) =>
            normalizeThreadReply({
              id: replyDoc.id,
              threadOwnerUid: context.threadOwnerUid,
              activityId: context.activityId,
              ...replyDoc.data(),
            })
          )
        );
        setReplyCountForThreadKey(threadKey, snapshot.size);
        rebuildFeedReplyEntriesFromThreadStreams();
        rebuildMediaReplyCountsByItemKey();
        renderFeedPageIfVisible();
      },
      (error) => {
        console.warn("Could not subscribe to feed replies.", error);
      }
    );

    feedReplyUnsubscribers.set(threadKey, unsubscribe);
  });

  rebuildFeedReplyEntriesFromThreadStreams();
}

function rebuildFeedReplyEntriesFromThreadStreams() {
  feedReplyEntries = [...feedRepliesByThreadKey.values()]
    .flat()
    .sort(compareFeedEntriesByTime);
}

function setReplyCountForThreadKey(threadKey, count) {
  if (!threadKey) {
    return;
  }

  const nextReplyCountsByThreadKey = new Map(replyCountsByThreadKey);
  const total = Number(count || 0);

  if (total > 0) {
    nextReplyCountsByThreadKey.set(threadKey, total);
  } else {
    nextReplyCountsByThreadKey.delete(threadKey);
  }

  replyCountsByThreadKey = nextReplyCountsByThreadKey;
}

function syncFeedLikeSubscriptions(entries = []) {
  if (!db || !runtimeConfig?.collections?.users || !runtimeConfig?.collections?.trips || !currentUser?.uid) {
    return;
  }

  const desiredTargets = getFeedLikeWatchTargets(entries);

  feedLikeUnsubscribers.forEach((unsubscribe, targetKey) => {
    if (!desiredTargets.has(targetKey)) {
      unsubscribe();
      feedLikeUnsubscribers.delete(targetKey);
      feedLikeEventsByTargetKey.delete(targetKey);
    }
  });

  desiredTargets.forEach((context, targetKey) => {
    if (feedLikeUnsubscribers.has(targetKey)) {
      return;
    }

    const unsubscribe = onSnapshot(
      context.collectionRef,
      (snapshot) => {
        const actors = new Set();
        const events = snapshot.docs
          .map((likeDoc) => {
            const actorUid = String(likeDoc.id || "");

            if (!actorUid) {
              return null;
            }

            actors.add(actorUid);
            return buildFeedLikeEventFromDoc(likeDoc, context, actorUid);
          })
          .filter(Boolean);

        setLikeActorsForTargetKey(targetKey, actors);
        feedLikeEventsByTargetKey.set(targetKey, events);
        rebuildFeedLikeEventsFromTargetStreams();
        scheduleInteractionRefresh();
      },
      (error) => {
        console.warn("Could not subscribe to feed likes.", error);
      }
    );

    feedLikeUnsubscribers.set(targetKey, unsubscribe);
  });

  rebuildFeedLikeEventsFromTargetStreams();
}

function getFeedLikeWatchTargets(entries = []) {
  const targets = new Map();
  const addTarget = (context) => {
    if (context?.targetKey && context.collectionRef) {
      targets.set(context.targetKey, context);
    }
  };

  entries.forEach((entry) => {
    if (entry?.feedType === "upload") {
      addTarget(buildMediaItemLikeWatchTarget(entry));
      return;
    }

    addTarget(buildSocialLikeWatchTarget(entry));
  });

  getUniqueFeedRootActivities()
    .slice(0, 180)
    .forEach((entry) => addTarget(buildSocialLikeWatchTarget(entry)));

  feedUploadItems
    .slice(0, 180)
    .forEach((item) => addTarget(buildMediaItemLikeWatchTarget(item)));

  feedReplyEntries
    .slice(0, 240)
    .forEach((reply) => addTarget(buildSocialLikeWatchTarget(reply)));

  return targets;
}

function buildSocialLikeWatchTarget(entry) {
  const context = buildSocialLikeActionContext(entry);

  if (!context?.targetKey) {
    return null;
  }

  const collectionRef = getLikeCollectionRefForContext(context);

  return collectionRef ? { ...context, collectionRef } : null;
}

function buildMediaItemLikeWatchTarget(entry) {
  const item = entry?.item || entry;
  const tripId = String(entry?.tripId || item?.tripId || "");
  const folderId = String(entry?.folderId || item?.folderId || item?.sourceFolderId || "");
  const itemId = String(entry?.itemId || item?.id || "");
  const targetKey = buildMediaItemKey(tripId, folderId, itemId);

  if (!targetKey) {
    return null;
  }

  const context = {
    targetKind: "media-item",
    targetKey,
    tripId,
    folderId,
    itemId,
    commentId: "",
    threadOwnerUid: "",
    activityId: "",
    actorUid: "",
    replyId: "",
  };
  const collectionRef = getLikeCollectionRefForContext(context);

  return collectionRef ? { ...context, collectionRef } : null;
}

function getLikeCollectionRefForContext(context) {
  if (!db || !context?.targetKind) {
    return null;
  }

  if (context.targetKind === "media-item" && context.tripId && context.folderId && context.itemId) {
    return collection(
      db,
      runtimeConfig.collections.trips,
      context.tripId,
      "folders",
      context.folderId,
      "items",
      context.itemId,
      "likes"
    );
  }

  if (
    context.targetKind === "media-comment" &&
    context.tripId &&
    context.folderId &&
    context.itemId &&
    context.commentId
  ) {
    return collection(
      db,
      runtimeConfig.collections.trips,
      context.tripId,
      "folders",
      context.folderId,
      "items",
      context.itemId,
      "comments",
      context.commentId,
      "likes"
    );
  }

  if (context.targetKind === "wall-post" && context.threadOwnerUid && context.activityId) {
    return collection(
      db,
      runtimeConfig.collections.users,
      context.threadOwnerUid,
      "activity",
      context.activityId,
      "likes"
    );
  }

  if (
    context.targetKind === "thread-reply" &&
    context.threadOwnerUid &&
    context.activityId &&
    context.replyId
  ) {
    return collection(
      db,
      runtimeConfig.collections.users,
      context.threadOwnerUid,
      "activity",
      context.activityId,
      "replies",
      context.replyId,
      "likes"
    );
  }

  return null;
}

function buildFeedLikeEventFromDoc(likeDoc, context, actorUid) {
  const data = likeDoc.data ? likeDoc.data() : {};

  return {
    id: `${context.targetKey}:${actorUid}`,
    actorUid,
    targetKey: context.targetKey,
    targetKind: context.targetKind,
    tripId: String(context.tripId || ""),
    folderId: String(context.folderId || ""),
    itemId: String(context.itemId || ""),
    commentId: String(context.commentId || ""),
    threadOwnerUid: String(context.threadOwnerUid || ""),
    activityId: String(context.activityId || ""),
    replyId: String(context.replyId || ""),
    createdAtMs: coerceTimestampToMs(data?.createdAt, data?.createdAtMs),
  };
}

function setLikeActorsForTargetKey(targetKey, actors) {
  if (!targetKey) {
    return;
  }

  const nextLikeActorsByTargetKey = new Map(likeActorsByTargetKey);
  const actorSet = new Set(actors || []);

  if (actorSet.size > 0) {
    nextLikeActorsByTargetKey.set(targetKey, actorSet);
  } else {
    nextLikeActorsByTargetKey.delete(targetKey);
  }

  likeActorsByTargetKey = nextLikeActorsByTargetKey;
}

function rebuildFeedLikeEventsFromTargetStreams() {
  feedLikeEvents = [...feedLikeEventsByTargetKey.values()]
    .flat()
    .sort(compareFeedEntriesByTime);
}

function stopFeedStreams() {
  feedActivityUnsubscribers.forEach((unsubscribe) => unsubscribe());
  feedReplyUnsubscribers.forEach((unsubscribe) => unsubscribe());
  feedLikeUnsubscribers.forEach((unsubscribe) => unsubscribe());
  feedActivityUnsubscribers = new Map();
  feedActivityEntriesByUser = new Map();
  feedReplyUnsubscribers = new Map();
  feedRepliesByThreadKey = new Map();
  feedLikeUnsubscribers = new Map();
  feedLikeEventsByTargetKey = new Map();
  feedRootActivities = [];
  feedUploadItems = [];
  feedReplyEntries = [];
  feedLikeEvents = [];
}

// These collection-group listeners keep counters and "liked by me" state fresh
// across the archive, profile pages, preview modal, thread modal, and feed.
function subscribeToMediaCommentAggregates() {
  mediaCommentAggregateUnsubscribe?.();

  mediaCommentAggregateUnsubscribe = onSnapshot(
    collectionGroup(db, "comments"),
    (snapshot) => {
      const nextCommentCountsByItemKey = new Map();
      const nextCommentEntriesByItemKey = new Map();
      const nextMediaItemKeyByThreadKey = new Map();

      snapshot.docs.forEach((commentDoc) => {
        const comment = normalizeMediaComment({ id: commentDoc.id, ...commentDoc.data() });
        const itemKey = buildMediaItemKey(comment.tripId, comment.folderId, comment.itemId);
        const threadKey = buildThreadKey(getThreadOwnerUid(comment), comment.id);

        if (itemKey) {
          nextCommentCountsByItemKey.set(
            itemKey,
            Number(nextCommentCountsByItemKey.get(itemKey) || 0) + 1
          );

          if (!nextCommentEntriesByItemKey.has(itemKey)) {
            nextCommentEntriesByItemKey.set(itemKey, []);
          }

          nextCommentEntriesByItemKey.get(itemKey).push(comment);
        }

        if (itemKey && threadKey) {
          nextMediaItemKeyByThreadKey.set(threadKey, itemKey);
        }
      });

      mediaCommentCountsByItemKey = nextCommentCountsByItemKey;
      mediaCommentEntriesByItemKey = nextCommentEntriesByItemKey;
      mediaItemKeyByThreadKey = nextMediaItemKeyByThreadKey;
      rebuildMediaReplyCountsByItemKey();
      scheduleInteractionRefresh();
    },
    (error) => {
      console.warn("Could not subscribe to media comment aggregates.", error);
    }
  );
}

function syncMediaCommentAggregateCacheForItem(context, comments = []) {
  const itemKey = buildMediaItemKey(context?.tripId, context?.folderId, context?.itemId);

  if (!itemKey) {
    return;
  }

  const nextCommentCountsByItemKey = new Map(mediaCommentCountsByItemKey);
  const nextCommentEntriesByItemKey = new Map(mediaCommentEntriesByItemKey);
  const nextMediaItemKeyByThreadKey = new Map(mediaItemKeyByThreadKey);

  nextMediaItemKeyByThreadKey.forEach((mappedItemKey, threadKey) => {
    if (mappedItemKey === itemKey) {
      nextMediaItemKeyByThreadKey.delete(threadKey);
    }
  });

  if (comments.length > 0) {
    nextCommentCountsByItemKey.set(itemKey, comments.length);
    nextCommentEntriesByItemKey.set(itemKey, comments);
  } else {
    nextCommentCountsByItemKey.delete(itemKey);
    nextCommentEntriesByItemKey.delete(itemKey);
  }

  comments.forEach((comment) => {
    const threadKey = buildThreadKey(getThreadOwnerUid(comment), comment.id);

    if (threadKey) {
      nextMediaItemKeyByThreadKey.set(threadKey, itemKey);
    }
  });

  mediaCommentCountsByItemKey = nextCommentCountsByItemKey;
  mediaCommentEntriesByItemKey = nextCommentEntriesByItemKey;
  mediaItemKeyByThreadKey = nextMediaItemKeyByThreadKey;
  rebuildMediaReplyCountsByItemKey();
}

function subscribeToThreadReplyAggregates() {
  threadReplyAggregateUnsubscribe?.();

  threadReplyAggregateUnsubscribe = onSnapshot(
    collectionGroup(db, "replies"),
    (snapshot) => {
      const nextReplyCountsByThreadKey = new Map();
      const nextFeedReplyEntries = [];

      snapshot.docs.forEach((replyDoc) => {
        const pathSegments = replyDoc.ref.path.split("/");
        const threadOwnerUid = String(pathSegments[1] || "");
        const activityId = String(pathSegments[3] || "");
        const threadKey = buildThreadKey(threadOwnerUid, activityId);

        if (!threadKey) {
          return;
        }

        nextReplyCountsByThreadKey.set(
          threadKey,
          Number(nextReplyCountsByThreadKey.get(threadKey) || 0) + 1
        );

        nextFeedReplyEntries.push(
          normalizeThreadReply({
            id: replyDoc.id,
            threadOwnerUid,
            activityId,
            ...replyDoc.data(),
          })
        );
      });

      replyCountsByThreadKey = nextReplyCountsByThreadKey;
      feedReplyEntries = nextFeedReplyEntries.sort(compareFeedEntriesByTime);
      rebuildMediaReplyCountsByItemKey();
      scheduleInteractionRefresh();
    },
    (error) => {
      console.warn("Could not subscribe to thread reply aggregates.", error);
    }
  );
}

function subscribeToLikeAggregates() {
  likeAggregateUnsubscribe?.();

  likeAggregateUnsubscribe = onSnapshot(
    collectionGroup(db, "likes"),
    (snapshot) => {
      const nextLikeActorsByTargetKey = new Map();
      const nextFeedLikeEvents = [];

      snapshot.docs.forEach((likeDoc) => {
        const targetKey = buildLikeTargetKeyFromPath(likeDoc.ref.path);
        const actorUid = String(likeDoc.id || "");

        if (!targetKey || !actorUid) {
          return;
        }

        if (!nextLikeActorsByTargetKey.has(targetKey)) {
          nextLikeActorsByTargetKey.set(targetKey, new Set());
        }

        nextLikeActorsByTargetKey.get(targetKey).add(actorUid);
        nextFeedLikeEvents.push(normalizeFeedLikeEvent(likeDoc));
      });

      likeActorsByTargetKey = nextLikeActorsByTargetKey;
      feedLikeEvents = nextFeedLikeEvents.filter(Boolean).sort(compareFeedEntriesByTime);
      scheduleInteractionRefresh();
    },
    (error) => {
      console.warn("Could not subscribe to like aggregates.", error);
    }
  );
}

function rebuildMediaReplyCountsByItemKey() {
  const nextMediaReplyCountsByItemKey = new Map();

  replyCountsByThreadKey.forEach((replyCount, threadKey) => {
    const itemKey = mediaItemKeyByThreadKey.get(threadKey);

    if (!itemKey) {
      return;
    }

    nextMediaReplyCountsByItemKey.set(
      itemKey,
      Number(nextMediaReplyCountsByItemKey.get(itemKey) || 0) + Number(replyCount || 0)
    );
  });

  mediaReplyCountsByItemKey = nextMediaReplyCountsByItemKey;
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
        if (selectedFolderId && !folders.some((folder) => folder.id === selectedFolderId)) {
          selectedFolders.set(trip.id, "");
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

// Mirrors Firebase Auth users into the app's `users` collection and returns the
// normalized member profile that render/auth logic expects.
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
    lastActiveAt: serverTimestamp(),
    lastActiveAtMs: Date.now(),
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
    lastActiveAtMs: Date.now(),
  });
}

function startPresenceHeartbeat() {
  stopPresenceHeartbeat();
  void updatePresenceHeartbeat();
  presenceHeartbeatTimer = window.setInterval(() => {
    void updatePresenceHeartbeat();
  }, PRESENCE_HEARTBEAT_INTERVAL_MS);
}

function stopPresenceHeartbeat() {
  if (presenceHeartbeatTimer) {
    window.clearInterval(presenceHeartbeatTimer);
    presenceHeartbeatTimer = 0;
  }
  presenceHeartbeatInFlight = false;
}

async function updatePresenceHeartbeat() {
  if (
    presenceHeartbeatInFlight ||
    !db ||
    !runtimeConfig?.collections?.users ||
    !currentUser?.uid ||
    document.visibilityState === "hidden"
  ) {
    return;
  }

  presenceHeartbeatInFlight = true;

  try {
    const nowMs = Date.now();
    await setDoc(
      doc(db, runtimeConfig.collections.users, currentUser.uid),
      {
        lastActiveAt: serverTimestamp(),
        lastActiveAtMs: nowMs,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    if (currentUserProfile) {
      currentUserProfile = normalizeFriend({
        ...currentUserProfile,
        lastActiveAtMs: nowMs,
      });
    }
  } catch (error) {
    console.warn("Could not update online presence.", error);
  } finally {
    presenceHeartbeatInFlight = false;
  }
}

async function handleProfileDetailsSubmit(event) {
  event.preventDefault();

  const profileView = getActiveProfileView();
  const targetFriend = profileView?.state === "ready" ? profileView.friend : null;
  const isEditingSelf = Boolean(targetFriend?.uid && targetFriend.uid === currentUser?.uid);
  const canAdminEditOtherProfile = Boolean(
    targetFriend?.uid &&
      !isEditingSelf &&
      isAdminViewEnabled()
  );

  if (!db || !currentUser?.uid || !targetFriend?.uid || (!isEditingSelf && !canAdminEditOtherProfile)) {
    authDetail.textContent = STRINGS.profile.signInRequired;
    return;
  }

  const nextDisplayName = normalizeDisplayName(profileDisplayNameInput?.value);
  let routeId = normalizeRouteId(targetFriend.routeId);

  if (isEditingSelf) {
    const requestedRouteId = normalizeRouteId(profileRouteInput?.value);

    if (!isValidRouteId(requestedRouteId)) {
      authDetail.textContent = STRINGS.profile.routeInvalid;
      return;
    }

    routeId = await ensureUniqueRouteId(requestedRouteId, currentUser.uid);

    if (routeId !== requestedRouteId) {
      authDetail.textContent = STRINGS.profile.routeTaken;
      return;
    }
  }

  profileDetailsSubmit?.toggleAttribute("disabled", true);

  try {
    await setDoc(
      doc(db, runtimeConfig.collections.users, targetFriend.uid),
      {
        uid: targetFriend.uid,
        email: targetFriend.email || "",
        displayName: nextDisplayName,
        googleName: normalizePersonName(
          targetFriend.googleName ||
            getFriendGoogleName(targetFriend)
        ),
        routeId,
        photoURL: targetFriend.photoStoragePath ? targetFriend.photoURL || "" : "",
        photoStoragePath: targetFriend.photoStoragePath || "",
        role: targetFriend.role || ROLE_FRIEND,
        isAdmin: isElevatedRole(targetFriend.role || ROLE_FRIEND),
        updatedAt: serverTimestamp(),
        updatedByUid: currentUser.uid,
        updatedByEmail: currentUser.email || "",
      },
      { merge: true }
    );

    friends = friends
      .map((entry) =>
        entry.uid === targetFriend.uid
          ? normalizeFriend({
              ...entry,
              uid: targetFriend.uid,
              email: targetFriend.email || "",
              displayName: nextDisplayName,
              googleName: normalizePersonName(
                targetFriend.googleName ||
                  getFriendGoogleName(targetFriend)
              ),
              routeId,
              photoURL: targetFriend.photoStoragePath ? targetFriend.photoURL || "" : "",
              photoStoragePath: targetFriend.photoStoragePath || "",
              role: targetFriend.role || ROLE_FRIEND,
            })
          : entry
      )
      .sort(compareFriends);

    if (targetFriend.uid === currentUser.uid && currentUserProfile) {
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
    }

    if (!isEditingSelf) {
      authDetail.textContent = `${getFriendLabel({ ...targetFriend, displayName: nextDisplayName }).toUpperCase()} DISPLAY NAME UPDATED.`;
      profileDetailsSubmit?.toggleAttribute("disabled", false);
      renderAll();
      return;
    }

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

async function handleFeaturedClipToggleClick(trigger) {
  if (!db || !isAdminViewEnabled()) {
    return;
  }

  const tripId = String(trigger.getAttribute("data-trip-id") || "");
  const folderId = String(trigger.getAttribute("data-folder-id") || "");
  const itemId = String(trigger.getAttribute("data-item-id") || "");
  const item = getItemsForFolder(tripId, folderId).find((entry) => entry.id === itemId) || null;
  const sourceFolderId = resolveItemSourceFolderId(item, folderId);
  const siteSettingsRef = getSiteSettingsRef();

  if (!siteSettingsRef || !tripId || !sourceFolderId || !itemId || !item || !isVideoPreviewItem(item)) {
    return;
  }

  const nextFeaturedClip = isFeaturedClipItem(item, tripId, sourceFolderId)
    ? null
    : {
        tripId,
        folderId: sourceFolderId,
        itemId,
      };

  trigger.disabled = true;

  try {
    await setDoc(
      siteSettingsRef,
      {
        featuredClip: nextFeaturedClip || deleteField(),
        updatedAt: serverTimestamp(),
        updatedByUid: currentUser?.uid || "",
        updatedByEmail: currentUser?.email || "",
      },
      { merge: true }
    );

    featuredClip = normalizeFeaturedClip(nextFeaturedClip);
    renderFeaturedClip();
    renderVisibleRouteContent();
    authDetail.textContent = nextFeaturedClip
      ? `${getItemDisplayName(item).toUpperCase()} SET AS FEATURED CLIP.`
      : "FEATURED CLIP CLEARED.";
  } catch (error) {
    authDetail.textContent = getErrorMessage(error, "Could not update featured clip.");
    trigger.disabled = false;
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

// -----------------------------------------------------------------------------
// Media Uploads, Authorship, And Item Editing
// -----------------------------------------------------------------------------
// Uploads write Storage objects plus Firestore item docs. The helpers below also
// preserve author aliases and keep edit/move dialogs aligned with folder state.
async function handleUploadSubmit(event) {
  event.preventDefault();

  if (!canUploadMedia()) {
    requestGoogleSignIn(STRINGS.uploads.signInRequired);
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
    requestGoogleSignIn(STRINGS.uploads.textSignInRequired);
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
    const previewRestoreContext = takePendingVideoPreviewRestore("edit-item");
    resetTextPostEditor();
    await loadFolderItems(tripId, folderId);
    renderAll();

    if (previewRestoreContext) {
      reopenVideoPreviewFromRestore(previewRestoreContext);
    }
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
  const previewRestoreContext = takePendingVideoPreviewRestore("edit-item");
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

  if (previewRestoreContext) {
    reopenVideoPreviewFromRestore(previewRestoreContext);
  }
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
  const previewRestoreContext = takePendingVideoPreviewRestore("move-item");
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

  if (previewRestoreContext) {
    reopenVideoPreviewFromRestore(previewRestoreContext);
  }
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
    const previewRestoreContext = takePendingVideoPreviewRestore("move-item");
    const previewRestoreFolderId = previewRestoreContext
      ? isHighlightFolder(previewRestoreContext.folderId)
        ? previewRestoreContext.folderId
        : destinationFolderId
      : "";
    resetItemMoveDialog();
    await Promise.all([
      loadFolderItems(tripId, folderId),
      loadFolderItems(tripId, destinationFolderId),
    ]);
    renderAll();

    if (previewRestoreContext) {
      reopenVideoPreviewFromRestore(previewRestoreContext, previewRestoreFolderId);
    }

    authDetail.textContent = `MOVED ${movedItemName.toUpperCase()} TO ${destinationFolder.slug.toUpperCase()}/`;
  } catch (error) {
    authDetail.textContent = getErrorMessage(error, "Could not move item.");
    moveItemSubmitButton?.toggleAttribute("disabled", false);
  }
}

// -----------------------------------------------------------------------------
// Media Preview Player
// -----------------------------------------------------------------------------
// The preview modal owns video/image playback, route selection sync, autoplay,
// viewed-recently tracking, and the comment/thread surface for the open item.
function openVideoPreview(tripId, folderId, itemId, view = "archive", options = {}) {
  if (!videoPreviewPlayer || !tripId || !folderId || !itemId) {
    return;
  }

  currentVideoPreviewContext = {
    tripId,
    folderId,
    itemId,
    view,
    threadCommentId: String(options?.threadCommentId || ""),
    threadOwnerUid: String(options?.threadOwnerUid || ""),
    preservePageContext: Boolean(options?.preservePageContext),
    restoreScrollY: Number.isFinite(Number(options?.restoreScrollY))
      ? Number(options.restoreScrollY)
      : window.scrollY,
  };
  const previewState = getCurrentVideoPreviewState();

  if (!previewState) {
    resetVideoPreview();
    return;
  }

  clearVideoPreviewNotificationHighlight({ render: false });
  const newCommentNotifications = consumeMediaCommentNotificationsForPreview(previewState);

  videoPreviewCommentComposerOpen = false;
  markPreviewItemViewed(previewState);
  if (!currentVideoPreviewContext.preservePageContext) {
    syncRouteSelectionToPreview(previewState);
  }
  syncVideoPreviewNavigation(previewState);
  syncVideoPreviewMedia(previewState);
  syncVideoPreviewComments(previewState);
  setVideoPreviewModalOpen(true);
  syncCommentNotificationControls();
  if (newCommentNotifications.length > 0) {
    scheduleInteractionRefresh();
  }
  if (!currentVideoPreviewContext.preservePageContext) {
    schedulePreviewRowAlignment(previewState);
  }

  if (isVideoPreviewItem(previewState.currentItem)) {
    window.requestAnimationFrame(() => {
      const playPromise = videoPreviewPlayer.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    });
  }
}

function navigateVideoPreview(direction, options = {}) {
  const previewState = getCurrentVideoPreviewState();

  if (!previewState) {
    return;
  }

  if (options?.manual) {
    setVideoPreviewAutoplayEnabled(false);
  }

  const nextEntry = previewState.sequence[previewState.currentIndex + direction];

  if (!nextEntry) {
    if (videoPreviewAutoplayEnabled) {
      setVideoPreviewAutoplayEnabled(false);
    }

    return;
  }

  openVideoPreview(nextEntry.tripId, nextEntry.folderId, nextEntry.itemId, previewState.view, {
    preservePageContext: Boolean(currentVideoPreviewContext?.preservePageContext),
    restoreScrollY: Number(currentVideoPreviewContext?.restoreScrollY || window.scrollY),
  });
}

function resetVideoPreview() {
  const previewState = getCurrentVideoPreviewState();
  const shouldPreservePageContext = Boolean(currentVideoPreviewContext?.preservePageContext);
  const restoreScrollY = Number(currentVideoPreviewContext?.restoreScrollY || window.scrollY);
  clearVideoPreviewAutoplayTimer();
  setVideoPreviewAutoplayEnabled(false);
  resetVideoPreviewThreadSelection();
  videoPreviewCommentComposerOpen = false;
  clearVideoPreviewNotificationHighlight({ render: false });
  currentVideoPreviewContext = null;
  syncVideoPreviewNavigation(null);
  syncVideoPreviewMedia(null);
  syncVideoPreviewComments(null);

  setVideoPreviewModalOpen(false);

  if (previewState && !shouldPreservePageContext) {
    schedulePreviewRowAlignment(previewState);
  } else if (shouldPreservePageContext) {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: restoreScrollY, left: 0, behavior: "auto" });
    });
  }
}

function getCurrentVideoPreviewState() {
  if (!currentVideoPreviewContext) {
    return null;
  }

  const { tripId, folderId, itemId, view } = currentVideoPreviewContext;
  const sequence = getPreviewSequenceForView(view);
  const currentIndex = sequence.findIndex((entry) =>
    entry.tripId === tripId &&
    entry.folderId === folderId &&
    entry.itemId === itemId
  );

  if (currentIndex === -1) {
    return null;
  }

  const currentEntry = sequence[currentIndex];

  return {
    tripId: currentEntry.tripId,
    folderId: currentEntry.folderId,
    itemId: currentEntry.itemId,
    view,
    threadCommentId: String(currentVideoPreviewContext.threadCommentId || ""),
    threadOwnerUid: String(currentVideoPreviewContext.threadOwnerUid || ""),
    preservePageContext: Boolean(currentVideoPreviewContext.preservePageContext),
    restoreScrollY: Number(currentVideoPreviewContext.restoreScrollY || 0),
    items: sequence.map((entry) => entry.item),
    sequence,
    currentIndex,
    currentEntry,
    currentItem: currentEntry.item,
  };
}

function buildVideoPreviewRestoreContext(action, previewState = getCurrentVideoPreviewState()) {
  const item = previewState?.currentItem || null;
  const sourceFolderId = resolveItemSourceFolderId(item, previewState?.folderId || "");

  if (!previewState?.tripId || !previewState?.folderId || !sourceFolderId || !item?.id) {
    return null;
  }

  return {
    action,
    tripId: previewState.tripId,
    folderId: previewState.folderId,
    sourceFolderId,
    itemId: item.id,
    view: previewState.view,
    threadCommentId: previewState.threadCommentId,
    threadOwnerUid: previewState.threadOwnerUid,
    preservePageContext: previewState.preservePageContext,
    restoreScrollY: previewState.restoreScrollY || window.scrollY,
  };
}

function setPendingVideoPreviewRestore(context) {
  pendingVideoPreviewRestoreAfterItemAction = context || null;
}

function takePendingVideoPreviewRestore(action) {
  const context = pendingVideoPreviewRestoreAfterItemAction;

  if (!context || context.action !== action) {
    return null;
  }

  pendingVideoPreviewRestoreAfterItemAction = null;
  return context;
}

function clearPendingVideoPreviewRestore(action = "") {
  if (
    !action ||
    pendingVideoPreviewRestoreAfterItemAction?.action === action
  ) {
    pendingVideoPreviewRestoreAfterItemAction = null;
  }
}

function reopenVideoPreviewFromRestore(context, folderIdOverride = "") {
  if (!context?.tripId || !context?.itemId) {
    return;
  }

  openVideoPreview(
    context.tripId,
    folderIdOverride || context.folderId,
    context.itemId,
    context.view || "archive",
    {
      threadCommentId: context.threadCommentId || "",
      threadOwnerUid: context.threadOwnerUid || "",
      preservePageContext: Boolean(context.preservePageContext),
      restoreScrollY: Number(context.restoreScrollY || window.scrollY),
    }
  );
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

  return items.filter(isPreviewableMediaItem);
}

function getPreviewSequenceForView(view = "archive") {
  const profileView = getActiveProfileView();
  const profileFriend = view === "profile" ? profileView?.friend || null : null;

  return trips.flatMap((trip) => {
    const folders = view === "profile" && profileFriend
      ? getProfileFoldersForTrip(profileFriend, trip.id)
      : getFoldersForTrip(trip.id);

    return folders.flatMap((folder) =>
      getFolderVideoItems(trip.id, folder.id, view).map((item) => ({
        tripId: trip.id,
        folderId: folder.id,
        itemId: item.id,
        item,
        sourceFolderId: resolveItemSourceFolderId(item, folder.id),
      }))
    );
  });
}

function syncRouteSelectionToPreview(previewState) {
  if (!previewState) {
    return;
  }

  setSelectedFolderId(previewState.tripId, previewState.folderId, previewState.view);

  if (previewState.view !== "profile") {
    if (isMobileTripLayout()) {
      trips.forEach((trip) => {
        expandedTrips.set(trip.id, trip.id === previewState.tripId);
      });
    } else {
      expandedTrips.set(previewState.tripId, true);
    }
  }

  renderVisibleRouteContent();
}

function schedulePreviewRowAlignment(previewState = getCurrentVideoPreviewState()) {
  if (!previewState?.tripId || !previewState?.folderId || !previewState?.itemId) {
    return;
  }

  window.requestAnimationFrame(() => {
    scrollPreviewRowIntoView(previewState);
  });
}

function scrollPreviewRowIntoView(previewState = getCurrentVideoPreviewState()) {
  if (!previewState?.tripId || !previewState?.folderId || !previewState?.itemId) {
    return;
  }

  const selector = [
    '[data-preview-row="true"]',
    `[data-view="${escapeCssSelectorToken(previewState.view)}"]`,
    `[data-trip-id="${escapeCssSelectorToken(previewState.tripId)}"]`,
    `[data-folder-id="${escapeCssSelectorToken(previewState.folderId)}"]`,
    `[data-item-id="${escapeCssSelectorToken(previewState.itemId)}"]`,
  ].join("");
  const rows = Array.from(document.querySelectorAll(selector));
  const row = rows.find((entry) => entry.getClientRects().length > 0) || rows[0] || null;

  if (!row || typeof row.scrollIntoView !== "function") {
    return;
  }

  row.scrollIntoView({ block: "center", inline: "nearest" });
}

function markPreviewItemViewed(previewState) {
  const nextKey = buildRecentMediaViewKey(
    previewState?.currentItem,
    previewState?.tripId,
    previewState?.folderId
  );

  if (!nextKey) {
    return;
  }

  recentMediaViews = pruneRecentMediaViews({
    ...recentMediaViews,
    [nextKey]: Date.now(),
  });
  persistRecentMediaViews(recentMediaViews);
}

function handleVideoPreviewAutoplayToggleChange(event) {
  setVideoPreviewAutoplayEnabled(Boolean(event.currentTarget?.checked));
}

function handleVideoPreviewPlayerEnded() {
  if (!videoPreviewAutoplayEnabled) {
    return;
  }

  navigateVideoPreview(1);
}

function clearVideoPreviewAutoplayTimer() {
  if (!videoPreviewAutoplayTimer) {
    if (videoPreviewAutoplayCountdownTimer) {
      window.clearInterval(videoPreviewAutoplayCountdownTimer);
      videoPreviewAutoplayCountdownTimer = 0;
    }
    videoPreviewAutoplayDeadlineMs = 0;
    syncVideoPreviewAutoplayTimerLabel();
    return;
  }

  window.clearTimeout(videoPreviewAutoplayTimer);
  videoPreviewAutoplayTimer = 0;
  if (videoPreviewAutoplayCountdownTimer) {
    window.clearInterval(videoPreviewAutoplayCountdownTimer);
    videoPreviewAutoplayCountdownTimer = 0;
  }
  videoPreviewAutoplayDeadlineMs = 0;
  syncVideoPreviewAutoplayTimerLabel();
}

function setVideoPreviewAutoplayEnabled(enabled) {
  videoPreviewAutoplayEnabled = Boolean(enabled);

  if (videoPreviewAutoplayToggle) {
    videoPreviewAutoplayToggle.checked = videoPreviewAutoplayEnabled;
  }

  scheduleVideoPreviewAutoplay();
}

function scheduleVideoPreviewAutoplay(previewState = getCurrentVideoPreviewState()) {
  clearVideoPreviewAutoplayTimer();

  if (!videoPreviewAutoplayEnabled || !previewState) {
    syncVideoPreviewAutoplayTimerLabel(previewState);
    return;
  }

  const nextEntry = previewState.sequence[previewState.currentIndex + 1];

  if (!nextEntry) {
    videoPreviewAutoplayEnabled = false;

    if (videoPreviewAutoplayToggle) {
      videoPreviewAutoplayToggle.checked = false;
    }

    syncVideoPreviewAutoplayTimerLabel(previewState);
    return;
  }

  if (isImagePreviewItem(previewState.currentItem)) {
    videoPreviewAutoplayDeadlineMs = Date.now() + AUTOPLAY_IMAGE_DURATION_MS;
    syncVideoPreviewAutoplayTimerLabel(previewState);
    videoPreviewAutoplayCountdownTimer = window.setInterval(() => {
      syncVideoPreviewAutoplayTimerLabel(previewState);
    }, AUTOPLAY_COUNTDOWN_INTERVAL_MS);
    videoPreviewAutoplayTimer = window.setTimeout(() => {
      navigateVideoPreview(1);
    }, AUTOPLAY_IMAGE_DURATION_MS);
    return;
  }

  syncVideoPreviewAutoplayTimerLabel(previewState);
}

function syncVideoPreviewAutoplayTimerLabel(previewState = getCurrentVideoPreviewState()) {
  if (!videoPreviewAutoplayTimerLabel) {
    return;
  }

  const hasNextEntry = Boolean(
    previewState && previewState.currentIndex < previewState.sequence.length - 1
  );

  if (!previewState) {
    videoPreviewAutoplayTimerLabel.textContent = "OFF";
    return;
  }

  if (!hasNextEntry) {
    videoPreviewAutoplayTimerLabel.textContent = "END";
    return;
  }

  if (!videoPreviewAutoplayEnabled) {
    videoPreviewAutoplayTimerLabel.textContent = "OFF";
    return;
  }

  if (isImagePreviewItem(previewState.currentItem) && videoPreviewAutoplayDeadlineMs) {
    const remainingMs = Math.max(0, videoPreviewAutoplayDeadlineMs - Date.now());
    videoPreviewAutoplayTimerLabel.textContent = formatAutoplayCountdown(remainingMs);
    return;
  }

  videoPreviewAutoplayTimerLabel.textContent = "ON END";
}

function formatAutoplayCountdown(remainingMs) {
  const seconds = Math.max(0, Math.ceil(Number(remainingMs || 0) / 1000));
  return `00:${String(seconds).padStart(2, "0")}`;
}

function syncVideoPreviewNavigation(previewState = getCurrentVideoPreviewState()) {
  const hasNextEntry = Boolean(
    previewState && previewState.currentIndex < previewState.sequence.length - 1
  );

  if (videoPreviewTitle) {
    videoPreviewTitle.textContent = previewState ? buildMediaPreviewTitle(previewState) : "";
  }

  if (videoPreviewFilename) {
    videoPreviewFilename.textContent = previewState ? buildMediaPreviewFilenameLabel(previewState) : "";
  }

  syncVideoPreviewAdminActions(previewState);

  if (videoPreviewSequence) {
    videoPreviewSequence.textContent = buildMediaPreviewSequenceLabel(previewState);
  }

  if (videoPreviewUpNext) {
    videoPreviewUpNext.textContent = buildVideoPreviewUpNextLabel(previewState);
  }

  if (videoPreviewAutoplayToggle) {
    videoPreviewAutoplayToggle.checked = videoPreviewAutoplayEnabled;
    videoPreviewAutoplayToggle.disabled = !previewState || !hasNextEntry;
  }

  syncVideoPreviewAutoplayTimerLabel(previewState);

  syncVideoPreviewCertification(previewState);
  renderVideoPreviewComments(previewState);

  if (videoPreviewPrevButton) {
    videoPreviewPrevButton.disabled = !previewState || previewState.currentIndex === 0;
  }

  if (videoPreviewNextButton) {
    videoPreviewNextButton.disabled = !hasNextEntry;
  }

  syncFloatingVideoPreviewNavigationButtons();
  scheduleVideoPreviewNavigationSync();
}

function syncFloatingVideoPreviewNavigationButtons() {
  if (videoPreviewFloatingPrevButton && videoPreviewPrevButton) {
    videoPreviewFloatingPrevButton.disabled = videoPreviewPrevButton.disabled;
  }

  if (videoPreviewFloatingNextButton && videoPreviewNextButton) {
    videoPreviewFloatingNextButton.disabled = videoPreviewNextButton.disabled;
  }

  if (videoPreviewFloatingCertifyButton && videoPreviewCertifyButton) {
    const certified = videoPreviewCertifyButton.textContent.trim() === "Uncertify";
    const hidden = videoPreviewCertifyButton.classList.contains("hidden");
    const baseClass = "min-h-9 min-w-0 flex-1 shrink border px-2 py-1.5 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.56rem] uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-40";
    const toneClass = certified
      ? "border-sky-300/32 bg-sky-100/[0.1] text-sky-100 hover:border-sky-200/55 hover:bg-sky-100/[0.16]"
      : "border-amber-200/35 bg-amber-100/[0.12] text-amber-50 hover:border-amber-100/55 hover:bg-amber-100/[0.18]";

    videoPreviewFloatingCertifyButton.className = `${hidden ? "hidden " : ""}${baseClass} ${toneClass}`;
    videoPreviewFloatingCertifyButton.disabled = videoPreviewCertifyButton.disabled;
    videoPreviewFloatingCertifyButton.textContent = videoPreviewCertifyButton.textContent;
    videoPreviewFloatingCertifyButton.setAttribute(
      "aria-label",
      videoPreviewCertifyButton.getAttribute("aria-label") || videoPreviewFloatingCertifyButton.textContent
    );
  }
}

function syncVideoPreviewMedia(previewState = getCurrentVideoPreviewState()) {
  const item = previewState?.currentItem || null;
  const isVideo = isVideoPreviewItem(item);
  const isImage = isImagePreviewItem(item);

  if (videoPreviewPlayer) {
    videoPreviewPlayer.classList.toggle("hidden", !isVideo);

    if (isVideo) {
      videoPreviewPlayer.pause();
      videoPreviewPlayer.src = item.downloadURL;
      videoPreviewPlayer.currentTime = 0;
      videoPreviewPlayer.load();
    } else {
      videoPreviewPlayer.pause();
      videoPreviewPlayer.removeAttribute("src");
      videoPreviewPlayer.load();
    }
  }

  if (videoPreviewImage) {
    videoPreviewImage.classList.toggle("hidden", !isImage);

    if (isImage) {
      videoPreviewImage.src = item.downloadURL;
      videoPreviewImage.alt = getItemDisplayName(item);
    } else {
      videoPreviewImage.removeAttribute("src");
      videoPreviewImage.alt = "";
    }
  }

  scheduleVideoPreviewAutoplay(previewState);
}

function buildMediaPreviewTitle(previewState) {
  const item = previewState?.currentItem || null;
  const previewType = isImagePreviewItem(item) ? "PHOTO PREVIEW" : "CLIP PREVIEW";
  const sourceFolderId = resolveItemSourceFolderId(item, previewState.folderId);
  const sourceLabel = buildItemSourceLabel(previewState.tripId, sourceFolderId);
  const sourceSuffix = sourceLabel ? ` // ${sourceLabel}` : "";

  return `${previewType}${sourceSuffix}`;
}

function buildMediaPreviewFilenameLabel(previewState) {
  const item = previewState?.currentItem || null;
  return item ? getItemDisplayName(item) : "";
}

function syncVideoPreviewAdminActions(previewState = getCurrentVideoPreviewState()) {
  if (!videoPreviewAdminActions) {
    return;
  }

  const item = previewState?.currentItem || null;
  const sourceFolderId = resolveItemSourceFolderId(item, previewState?.folderId || "");

  if (!previewState?.tripId || !sourceFolderId || !item?.id || item.kind !== "file") {
    videoPreviewAdminActions.innerHTML = "";
    videoPreviewAdminActions.classList.add("hidden");
    videoPreviewAdminActions.classList.remove("flex");
    return;
  }

  const baseButtonClass = "border border-white/12 bg-white/[0.03] px-2 py-1 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.54rem] uppercase tracking-[0.16em] text-stone-200 transition hover:border-white/30 hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-45";
  const deleteButtonClass = "border border-red-300/22 bg-red-400/[0.04] px-2 py-1 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.54rem] uppercase tracking-[0.16em] text-red-100/88 transition hover:border-red-300/45 hover:bg-red-400/[0.12] hover:text-red-50 disabled:cursor-not-allowed disabled:opacity-45";
  const buildButton = (action, label, className) => `
    <button
      type="button"
      data-action="${escapeHtml(action)}"
      data-trip-id="${escapeHtml(previewState.tripId)}"
      data-folder-id="${escapeHtml(sourceFolderId)}"
      data-item-id="${escapeHtml(item.id)}"
      class="${className}"
    >
      ${escapeHtml(label)}
    </button>
  `;
  const actions = [];

  if (canEditItem(item)) {
    actions.push(buildButton("edit-item", STRINGS.items.edit, baseButtonClass));
  }

  if (canMoveItem(item, previewState.tripId, sourceFolderId)) {
    actions.push(buildButton("move-item", STRINGS.items.move, baseButtonClass));
  }

  if (canDeleteItem(item)) {
    actions.push(buildButton("delete-item", STRINGS.items.delete, deleteButtonClass));
  }

  videoPreviewAdminActions.innerHTML = actions.join("");
  videoPreviewAdminActions.classList.toggle("hidden", actions.length === 0);
  videoPreviewAdminActions.classList.toggle("flex", actions.length > 0);
}

function buildMediaPreviewSequenceLabel(previewState) {
  if (!previewState) {
    return "";
  }

  const folderSequence = getFolderVideoItems(
    previewState.tripId,
    previewState.folderId,
    previewState.view
  );
  const currentSourceFolderId = resolveItemSourceFolderId(
    previewState.currentItem,
    previewState.folderId
  );
  const folderIndex = folderSequence.findIndex((item) =>
    item.id === previewState.itemId &&
    resolveItemSourceFolderId(item, previewState.folderId) === currentSourceFolderId
  );

  if (folderIndex === -1) {
    return `${previewState.currentIndex + 1}/${previewState.sequence.length}`;
  }

  return `${folderIndex + 1}/${folderSequence.length}`;
}

function buildVideoPreviewUpNextLabel(previewState) {
  if (!previewState) {
    return "";
  }

  const nextEntry = previewState.sequence[previewState.currentIndex + 1];
  const currentTrip = trips.find((trip) => trip.id === previewState.tripId) || null;
  const currentTripLabel = String(currentTrip?.slug || previewState.tripId || "").toUpperCase();
  const currentFolderId = resolveItemSourceFolderId(previewState.currentItem, previewState.folderId);

  if (!nextEntry) {
    return "";
  }

  const nextTrip = trips.find((trip) => trip.id === nextEntry.tripId) || null;
  const nextFolderId = resolveItemSourceFolderId(nextEntry.item, nextEntry.folderId);
  const nextFolder = getFoldersForTrip(nextEntry.tripId).find((folder) => folder.id === nextFolderId) || null;
  const nextPathLabel = buildFolderPathLabel(nextTrip, nextFolder)
    .replace(/\/$/, "")
    .toUpperCase();

  if (nextEntry.tripId !== previewState.tripId) {
    return `END OF ${currentTripLabel}. UP NEXT: ${nextPathLabel}`;
  }

  if (nextFolderId !== currentFolderId) {
    return `UP NEXT: ${nextPathLabel}`;
  }

  return "";
}

function isPreviewableMediaItem(item) {
  return Boolean(item?.kind === "file" && (isVideoPreviewItem(item) || isImagePreviewItem(item)));
}

function isVideoPreviewItem(item) {
  return Boolean(item?.mimeType && String(item.mimeType).startsWith("video/"));
}

function isImagePreviewItem(item) {
  return Boolean(item?.mimeType && String(item.mimeType).startsWith("image/"));
}

function syncVideoPreviewComments(previewState = getCurrentVideoPreviewState()) {
  syncMediaCommentsSubscription(previewState);
  renderVideoPreviewComments(previewState);
}

function syncMediaCommentsSubscription(previewState = getCurrentVideoPreviewState()) {
  const context = buildMediaCommentContext(previewState);
  const nextKey = context?.key || "";

  if (!nextKey || !db || !runtimeConfig?.collections?.trips) {
    mediaCommentsUnsubscribe?.();
    mediaCommentsUnsubscribe = null;
    currentMediaCommentsKey = "";
    return;
  }

  if (currentMediaCommentsKey === nextKey) {
    return;
  }

  mediaCommentsUnsubscribe?.();
  currentMediaCommentsKey = nextKey;

  if (!mediaCommentsByKey.has(nextKey)) {
    mediaCommentsByKey.set(nextKey, []);
  }

  const commentsQuery = query(
    collection(
      db,
      runtimeConfig.collections.trips,
      context.tripId,
      "folders",
      context.folderId,
      "items",
      context.itemId,
      "comments"
    ),
    orderBy("createdAtMs", "desc")
  );

  mediaCommentsUnsubscribe = onSnapshot(
    commentsQuery,
    (snapshot) => {
      const comments = snapshot.docs.map((commentDoc) =>
        normalizeMediaComment({ id: commentDoc.id, ...commentDoc.data() })
      );
      mediaCommentsByKey.set(nextKey, comments);
      syncMediaCommentAggregateCacheForItem(context, comments);
      if (buildMediaCommentContext(getCurrentVideoPreviewState())?.key === nextKey) {
        consumeMediaCommentNotificationsForPreview(getCurrentVideoPreviewState());
      }
      scheduleInteractionRefresh();
      renderVideoPreviewComments(getCurrentVideoPreviewState());
    },
    (error) => {
      setVideoPreviewCommentStatus(getFriendlyFirestoreMessage(error).toUpperCase());
    }
  );
}

function buildMediaCommentContext(previewState) {
  const item = previewState?.currentItem || null;

  if (!previewState || !item?.id) {
    return null;
  }

  const folderId = resolveItemSourceFolderId(item, previewState.folderId);

  if (!previewState.tripId || !folderId || !item.id) {
    return null;
  }

  const trip = trips.find((entry) => entry.id === previewState.tripId) || null;
  const folder = getFoldersForTrip(previewState.tripId).find((entry) => entry.id === folderId) || null;
  const sourceLabel =
    buildItemSourceLabel(previewState.tripId, folderId) ||
    buildFolderPathLabel(trip, folder).replace(/\/$/, "").toUpperCase();

  return {
    key: buildMediaCommentKey(previewState.tripId, folderId, item.id),
    tripId: previewState.tripId,
    folderId,
    itemId: item.id,
    itemName: getItemDisplayName(item),
    sourceLabel,
  };
}

function buildMediaCommentKey(tripId, folderId, itemId) {
  return `${tripId}:${folderId}:${itemId}`;
}

function buildMediaItemKey(tripId, folderId, itemId) {
  return tripId && folderId && itemId
    ? `media-item:${tripId}:${folderId}:${itemId}`
    : "";
}

function buildMediaItemKeyFromItem(item, tripId, folderId) {
  const sourceFolderId = resolveItemSourceFolderId(item, folderId);
  return buildMediaItemKey(tripId, sourceFolderId, item?.id);
}

function buildMediaCommentNotificationKey(comment) {
  return buildMediaCommentLikeKey(
    comment?.tripId,
    comment?.folderId,
    comment?.itemId,
    comment?.id
  );
}

function buildMediaReplyNotificationKey(reply) {
  return reply?.threadOwnerUid && reply?.activityId && reply?.id
    ? `media-comment-reply:${reply.threadOwnerUid}:${reply.activityId}:${reply.id}`
    : "";
}

function buildWallPostNotificationKey(entry) {
  const targetUserUid = String(entry?.targetUserUid || entry?.activityOwnerUid || "");
  const activityId = String(entry?.id || "");

  return targetUserUid && activityId
    ? `wall-post:${targetUserUid}:${activityId}`
    : "";
}

function buildActivityNotificationKey(entry) {
  if (entry?.type === "media-comment") {
    return buildMediaCommentNotificationKey(entry);
  }

  if (entry?.type === "thread-reply") {
    return buildMediaReplyNotificationKey(entry);
  }

  if (entry?.type === "wall-post") {
    return buildWallPostNotificationKey(entry);
  }

  return "";
}

function getCommentNotificationStorageKey(uid = currentUser?.uid) {
  return `${COMMENT_NOTIFICATION_STORAGE_KEY}:${String(uid || "anonymous")}`;
}

function syncCommentNotificationUserState(uid = currentUser?.uid || "") {
  const nextUid = String(uid || "");

  if (commentNotificationUserUid === nextUid) {
    return;
  }

  commentNotificationUserUid = nextUid;
  clearedMediaCommentNotificationKeys = nextUid
    ? loadClearedMediaCommentNotificationKeys(nextUid)
    : new Set();
  clearVideoPreviewNotificationHighlight({ render: false });
}

function loadClearedMediaCommentNotificationKeys(uid = currentUser?.uid) {
  if (!uid) {
    return new Set();
  }

  try {
    const rawValue = window.localStorage.getItem(getCommentNotificationStorageKey(uid));
    const parsed = rawValue ? JSON.parse(rawValue) : [];

    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

function persistClearedMediaCommentNotificationKeys() {
  if (!commentNotificationUserUid) {
    return;
  }

  try {
    window.localStorage.setItem(
      getCommentNotificationStorageKey(commentNotificationUserUid),
      JSON.stringify([...clearedMediaCommentNotificationKeys])
    );
  } catch {
    // Ignore storage persistence errors.
  }
}

function setVideoPreviewNotificationHighlight(comments = []) {
  clearVideoPreviewNotificationHighlight({ render: false });

  currentVideoPreviewNotificationCommentIds = new Set(
    comments
      .map((comment) => String(comment?.id || ""))
      .filter(Boolean)
  );

  if (currentVideoPreviewNotificationCommentIds.size === 0) {
    return;
  }

  videoPreviewNotificationHighlightTimer = window.setTimeout(() => {
    videoPreviewNotificationHighlightTimer = 0;
    currentVideoPreviewNotificationCommentIds = new Set();

    if (videoPreviewModalOpen) {
      renderVideoPreviewComments(getCurrentVideoPreviewState());
    }
  }, COMMENT_NOTIFICATION_HIGHLIGHT_MS);
}

function clearVideoPreviewNotificationHighlight(options = {}) {
  if (videoPreviewNotificationHighlightTimer) {
    window.clearTimeout(videoPreviewNotificationHighlightTimer);
    videoPreviewNotificationHighlightTimer = 0;
  }

  if (currentVideoPreviewNotificationCommentIds.size === 0) {
    return;
  }

  currentVideoPreviewNotificationCommentIds = new Set();

  if (options.render !== false && videoPreviewModalOpen) {
    renderVideoPreviewComments(getCurrentVideoPreviewState());
  }
}

function consumeMediaCommentNotificationsForPreview(previewState = getCurrentVideoPreviewState()) {
  const context = buildMediaCommentContext(previewState);

  if (!context) {
    clearVideoPreviewNotificationHighlight({ render: false });
    return [];
  }

  const notifications = getNewMediaCommentNotificationsForItem(
    previewState.currentItem,
    context.tripId,
    context.folderId
  );

  if (notifications.length === 0) {
    return [];
  }

  setVideoPreviewNotificationHighlight(notifications);
  clearMediaCommentNotifications(notifications, {
    render: false,
    preservePreviewHighlight: true,
  });
  scheduleInteractionRefresh();

  return notifications;
}

function getNewMediaCommentNotifications() {
  return getMediaCommentNotificationCandidates()
    .filter((comment) =>
      comment.tripId &&
      comment.folderId &&
      comment.itemId &&
      !isHighlightFolder(comment.folderId) &&
      isNewMediaCommentNotification(comment)
    )
    .sort(compareFeedEntriesByTime);
}

function getNewMediaReplyNotifications() {
  return getMediaReplyNotificationCandidates()
    .filter((reply) => isNewMediaReplyNotification(reply))
    .sort(compareFeedEntriesByTime);
}

function getNewMediaNotifications() {
  return [...getNewMediaCommentNotifications(), ...getNewMediaReplyNotifications()]
    .sort(compareFeedEntriesByTime);
}

function getNewWallPostNotifications() {
  return getWallPostNotificationCandidates()
    .filter((entry) => isNewWallPostNotification(entry))
    .sort(compareFeedEntriesByTime);
}

function getNewActivityNotifications() {
  const notificationsByKey = new Map();

  [
    ...getNewMediaCommentNotifications(),
    ...getNewMediaReplyNotifications(),
    ...getNewWallPostNotifications(),
  ].forEach((entry) => {
    const notificationKey = buildActivityNotificationKey(entry);

    if (notificationKey && !notificationsByKey.has(notificationKey)) {
      notificationsByKey.set(notificationKey, entry);
    }
  });

  return [...notificationsByKey.values()].sort(compareFeedEntriesByTime);
}

function getMediaCommentNotificationCandidates() {
  const candidatesByKey = new Map();
  const addCandidate = (entry) => {
    if (entry?.type !== "media-comment") {
      return;
    }

    const comment = normalizeMediaComment(entry);
    const notificationKey = buildMediaCommentNotificationKey(comment);

    if (notificationKey && !candidatesByKey.has(notificationKey)) {
      candidatesByKey.set(notificationKey, comment);
    }
  };

  mediaCommentEntriesByItemKey.forEach((comments) => {
    (comments || []).forEach(addCandidate);
  });

  mediaCommentsByKey.forEach((comments) => {
    (comments || []).forEach(addCandidate);
  });

  feedRootActivities.forEach(addCandidate);
  profileActivityByUser.forEach((entries) => {
    (entries || []).forEach(addCandidate);
  });

  return [...candidatesByKey.values()];
}

function getMediaReplyNotificationCandidates() {
  const candidatesByKey = new Map();
  const addCandidate = (entry) => {
    if (entry?.type !== "thread-reply") {
      return;
    }

    const rootEntry = entry.rootEntry || getRootActivityByThread(entry.threadOwnerUid, entry.activityId);

    if (rootEntry?.type !== "media-comment" || isHighlightFolder(rootEntry.folderId)) {
      return;
    }

    const reply = normalizeThreadReply({
      ...entry,
      rootEntry,
      tripId: rootEntry.tripId,
      folderId: rootEntry.folderId,
      itemId: rootEntry.itemId,
      itemName: rootEntry.itemName,
      sourceLabel: rootEntry.sourceLabel,
    });
    const notificationKey = buildMediaReplyNotificationKey(reply);

    if (notificationKey && !candidatesByKey.has(notificationKey)) {
      candidatesByKey.set(notificationKey, {
        ...reply,
        rootEntry,
        tripId: rootEntry.tripId,
        folderId: rootEntry.folderId,
        itemId: rootEntry.itemId,
        itemName: rootEntry.itemName,
        sourceLabel: rootEntry.sourceLabel,
      });
    }
  };

  feedReplyEntries.forEach(addCandidate);
  threadRepliesByKey.forEach((replies) => {
    (replies || []).forEach(addCandidate);
  });

  return [...candidatesByKey.values()];
}

function getWallPostNotificationCandidates() {
  const candidatesByKey = new Map();
  const addCandidate = (entry) => {
    if (entry?.type !== "wall-post") {
      return;
    }

    const wallPost = normalizeActivityEntry(entry);
    const notificationKey = buildWallPostNotificationKey(wallPost);
    const existing = candidatesByKey.get(notificationKey);

    if (
      notificationKey &&
      (!existing || shouldPreferWallPostNotificationCandidate(wallPost, existing))
    ) {
      candidatesByKey.set(notificationKey, wallPost);
    }
  };

  feedRootActivities.forEach(addCandidate);
  profileActivityByUser.forEach((entries) => {
    (entries || []).forEach(addCandidate);
  });

  return [...candidatesByKey.values()];
}

function shouldPreferWallPostNotificationCandidate(nextEntry, existingEntry) {
  const nextIsWallOwnerCopy = Boolean(
    nextEntry.activityOwnerUid && nextEntry.activityOwnerUid === nextEntry.targetUserUid
  );
  const existingIsWallOwnerCopy = Boolean(
    existingEntry.activityOwnerUid && existingEntry.activityOwnerUid === existingEntry.targetUserUid
  );

  if (nextIsWallOwnerCopy !== existingIsWallOwnerCopy) {
    return nextIsWallOwnerCopy;
  }

  return Number(nextEntry.createdAtMs || 0) > Number(existingEntry.createdAtMs || 0);
}

function getNewMediaCommentNotificationsForTrip(tripId) {
  return getNewMediaCommentNotifications().filter(
    (comment) => comment.tripId === String(tripId || "")
  );
}

function getNewMediaNotificationsForTrip(tripId) {
  return getNewMediaNotifications().filter(
    (entry) => entry.tripId === String(tripId || "")
  );
}

function getNewMediaCommentNotificationsForFolder(tripId, folderId) {
  if (!tripId || !folderId || isHighlightFolder(folderId)) {
    return [];
  }

  return getNewMediaCommentNotifications().filter(
    (comment) =>
      comment.tripId === String(tripId || "") &&
      comment.folderId === String(folderId || "")
  );
}

function getNewMediaNotificationsForFolder(tripId, folderId) {
  if (!tripId || !folderId || isHighlightFolder(folderId)) {
    return [];
  }

  return getNewMediaNotifications().filter(
    (entry) =>
      entry.tripId === String(tripId || "") &&
      entry.folderId === String(folderId || "")
  );
}

function getNewMediaCommentNotificationsForItem(item, tripId, folderId) {
  const uid = String(currentUser?.uid || "");

  if (!uid || item?.kind !== "file") {
    return [];
  }

  const itemKey = buildMediaItemKeyFromItem(item, tripId, folderId);

  if (!itemKey) {
    return [];
  }

  return getNewMediaCommentNotifications().filter((comment) =>
    buildMediaItemKey(comment.tripId, comment.folderId, comment.itemId) === itemKey &&
    isNewMediaCommentNotification(comment, uid)
  );
}

function getNewMediaReplyNotificationsForRoot(entry) {
  if (entry?.type !== "media-comment") {
    return [];
  }

  const threadKey = buildThreadKey(getThreadOwnerUid(entry), String(entry?.id || ""));

  if (!threadKey) {
    return [];
  }

  return getNewMediaReplyNotifications().filter(
    (reply) => buildThreadKey(reply.threadOwnerUid, reply.activityId) === threadKey
  );
}

function getNewMediaNotificationsForItem(item, tripId, folderId) {
  const uid = String(currentUser?.uid || "");

  if (!uid || item?.kind !== "file") {
    return [];
  }

  const itemKey = buildMediaItemKeyFromItem(item, tripId, folderId);

  if (!itemKey) {
    return [];
  }

  return getNewMediaNotifications().filter((entry) =>
    buildMediaItemKey(entry.tripId, entry.folderId, entry.itemId) === itemKey
  );
}

function isNewMediaCommentNotification(comment, uid = currentUser?.uid) {
  const notificationKey = buildMediaCommentNotificationKey(comment);
  const authorUid = getSocialCommentAuthorUid(comment);
  const userUid = String(uid || "");

  return Boolean(
    notificationKey &&
      userUid &&
      !clearedMediaCommentNotificationKeys.has(notificationKey) &&
      authorUid &&
      authorUid !== userUid
  );
}

function isNewMediaReplyNotification(reply, uid = currentUser?.uid) {
  const notificationKey = buildMediaReplyNotificationKey(reply);
  const rootEntry = reply?.rootEntry || getRootActivityByThread(reply?.threadOwnerUid, reply?.activityId);
  const actorUid = String(reply?.actorUid || "");
  const userUid = String(uid || "");

  return Boolean(
    notificationKey &&
      userUid &&
      rootEntry?.type === "media-comment" &&
      actorUid &&
      actorUid !== userUid &&
      !clearedMediaCommentNotificationKeys.has(notificationKey)
  );
}

function isNewWallPostNotification(entry, uid = currentUser?.uid) {
  const notificationKey = buildWallPostNotificationKey(entry);
  const actorUid = String(entry?.actorUid || "");
  const targetUserUid = String(entry?.targetUserUid || entry?.activityOwnerUid || "");
  const userUid = String(uid || "");

  return Boolean(
    notificationKey &&
      userUid &&
      targetUserUid === userUid &&
      !clearedMediaCommentNotificationKeys.has(notificationKey) &&
      actorUid &&
      actorUid !== userUid
  );
}

function isNewActivityNotification(entry, uid = currentUser?.uid) {
  if (entry?.type === "media-comment") {
    return isNewMediaCommentNotification(entry, uid) ||
      getNewMediaReplyNotificationsForRoot(entry).length > 0;
  }

  if (entry?.type === "thread-reply") {
    return isNewMediaReplyNotification(entry, uid);
  }

  if (entry?.type === "wall-post") {
    return isNewWallPostNotification(entry, uid);
  }

  return false;
}

function clearMediaCommentNotifications(comments = [], options = {}) {
  const notificationKeys = comments
    .map((comment) => buildMediaCommentNotificationKey(comment))
    .filter(Boolean);

  clearMediaCommentNotificationKeys(notificationKeys, options);
}

function clearMediaNotifications(entries = [], options = {}) {
  const notificationKeys = entries
    .map((entry) => buildActivityNotificationKey(entry))
    .filter(Boolean);

  clearMediaCommentNotificationKeys(notificationKeys, options);
}

function clearActivityNotifications(entries = [], options = {}) {
  const notificationKeys = entries
    .map((entry) => buildActivityNotificationKey(entry))
    .filter(Boolean);

  clearMediaCommentNotificationKeys(notificationKeys, options);
}

function clearMediaCommentNotificationKeys(notificationKeys = [], options = {}) {
  const uniqueNotificationKeys = [...new Set(notificationKeys.map(String).filter(Boolean))];

  if (uniqueNotificationKeys.length === 0) {
    return;
  }

  uniqueNotificationKeys.forEach((key) => {
    clearedMediaCommentNotificationKeys.add(key);
  });
  persistClearedMediaCommentNotificationKeys();

  if (options.preservePreviewHighlight !== true) {
    clearVideoPreviewNotificationHighlight({ render: false });
  }

  const shouldDelayRender = options.render !== false &&
    markClearingFeedNotificationCards(uniqueNotificationKeys);

  if (options.render === false) {
    syncCommentNotificationControls();
    return;
  }

  syncCommentNotificationControls();
  const finishClearRender = () => {
    renderVisibleRouteContent();

    if (videoPreviewModalOpen) {
      renderVideoPreviewComments(getCurrentVideoPreviewState());
    }

    scheduleCommentNotificationViewportObserverSync();
  };

  if (shouldDelayRender) {
    window.setTimeout(finishClearRender, COMMENT_NOTIFICATION_FADE_MS);
    return;
  }

  finishClearRender();
}

function getNewMediaCommentNotificationCount() {
  return getNewMediaCommentNotifications().length;
}

function getNewMediaNotificationCount() {
  return getNewMediaNotifications().length;
}

function getNewActivityNotificationCount() {
  return getNewActivityNotifications().length;
}

function renderNewCommentNotificationBadge(count, options = {}) {
  const total = Number(count || 0);

  if (total <= 0) {
    return "";
  }

  const label = options.label
    ? String(options.label)
    : options.countOnly
    ? `(${total})`
    : `${total} NEW ${total === 1 ? "COMMENT" : "COMMENTS"}`;
  const extraClass = options.className ? ` ${options.className}` : "";
  const notificationKeys = getNotificationOptionKeys(options);
  const notificationAttrs = notificationKeys.length > 0
    ? renderActivityNotificationAttributes(notificationKeys)
    : "";

  return `<span${notificationAttrs} class="inline-flex shrink-0 items-center border border-red-200/55 bg-red-500/18 px-1.5 py-0.5 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.5rem] uppercase leading-none tracking-[0.12em] text-red-50 shadow-[0_0_16px_rgba(239,68,68,0.16)]${extraClass}">${escapeHtml(label)}</span>`;
}

function getNotificationOptionKeys(options = {}) {
  const keys = Array.isArray(options.notificationKeys)
    ? options.notificationKeys
    : [options.notificationKey];

  return [...new Set(keys.map(String).filter(Boolean))];
}

function renderActivityNotificationAttributes(notificationKeys = []) {
  const keys = [...new Set(notificationKeys.map(String).filter(Boolean))];

  if (keys.length === 0) {
    return "";
  }

  const primaryKey = keys[0];
  const keyList = keys.join("|");

  return ` data-activity-notification="true" data-activity-notification-key="${escapeHtml(primaryKey)}" data-activity-notification-keys="${escapeHtml(keyList)}"`;
}

function renderFeedNotificationAttributes(notificationKeys = []) {
  const keys = [...new Set(notificationKeys.map(String).filter(Boolean))];

  if (keys.length === 0) {
    return "";
  }

  return ` data-feed-notification-key="${escapeHtml(keys[0])}" data-feed-notification-keys="${escapeHtml(keys.join("|"))}"`;
}

function renderUnreadMediaCommentNotificationBadge(entry, options = {}) {
  const notificationKey = buildMediaCommentNotificationKey(entry);

  return entry?.type === "media-comment" && isNewMediaCommentNotification(entry)
    ? renderNewCommentNotificationBadge(1, {
        ...options,
        notificationKey,
    })
    : "";
}

function renderUnreadActivityNotificationBadge(entry, options = {}) {
  return [
    renderUnreadDirectActivityNotificationBadge(entry, options),
    renderUnreadMediaReplyNotificationBadge(entry, options),
  ].filter(Boolean).join("");
}

function getActivityNotificationKeysForEntry(entry) {
  const keys = [];

  if (entry?.type === "media-comment" && isNewMediaCommentNotification(entry)) {
    keys.push(buildMediaCommentNotificationKey(entry));
  } else if (entry?.type === "wall-post" && isNewWallPostNotification(entry)) {
    keys.push(buildWallPostNotificationKey(entry));
  } else if (entry?.type === "thread-reply" && isNewMediaReplyNotification(entry)) {
    keys.push(buildMediaReplyNotificationKey(entry));
  }

  if (entry?.type === "media-comment") {
    getNewMediaReplyNotificationsForRoot(entry).forEach((reply) => {
      keys.push(buildMediaReplyNotificationKey(reply));
    });
  }

  return [...new Set(keys.filter(Boolean))];
}

function renderUnreadDirectActivityNotificationBadge(entry, options = {}) {
  if (entry?.type === "thread-reply") {
    return "";
  }

  const notificationKey = buildActivityNotificationKey(entry);
  const isUnread = entry?.type === "media-comment"
    ? isNewMediaCommentNotification(entry)
    : isNewActivityNotification(entry);

  return isUnread && notificationKey
    ? renderNewCommentNotificationBadge(1, {
        ...options,
        notificationKey,
      })
    : "";
}

function renderUnreadMediaReplyNotificationBadge(entry, options = {}) {
  const notifications = getNewMediaReplyNotificationsForRoot(entry);

  if (notifications.length === 0) {
    return "";
  }

  const label = `${notifications.length} NEW ${notifications.length === 1 ? "REPLY" : "REPLIES"}`;

  return renderNewCommentNotificationBadge(notifications.length, {
    ...options,
    label,
    notificationKeys: notifications.map((reply) => buildMediaReplyNotificationKey(reply)),
  });
}

function renderNewMediaNotificationBadge(notifications = [], options = {}) {
  const entries = (notifications || []).filter(Boolean);
  const total = entries.length;

  if (total === 0) {
    return "";
  }

  const commentCount = entries.filter((entry) => entry.type === "media-comment").length;
  const replyCount = entries.filter((entry) => entry.type === "thread-reply").length;
  const label = commentCount > 0 && replyCount > 0
    ? `${total} NEW UPDATES`
    : replyCount > 0
      ? `${replyCount} NEW ${replyCount === 1 ? "REPLY" : "REPLIES"}`
      : `${commentCount} NEW ${commentCount === 1 ? "COMMENT" : "COMMENTS"}`;

  return renderNewCommentNotificationBadge(total, {
    ...options,
    label,
  });
}

function renderFeedScopeCountMarkup(countLabel, notificationCount = getNewActivityNotificationCount()) {
  return `${escapeHtml(countLabel)}${renderNewCommentNotificationBadge(notificationCount, {
    countOnly: true,
    className: "ml-2 min-w-5 justify-center px-1.5 py-1 text-[0.5rem]",
  })}`;
}

function syncCommentNotificationControls() {
  const mediaCommentCount = getNewMediaNotificationCount();
  const activityCount = getNewActivityNotificationCount();

  syncActivityNotificationButtons(activityCount);

  syncNotificationClearButton(clearCommentNotificationsButton, mediaCommentCount);
  syncNotificationClearButton(clearFeedCommentNotificationsButton, activityCount);
}

function syncNotificationClearButton(button, count = 0) {
  if (!button) {
    return;
  }

  button.classList.toggle("hidden", count <= 0);
  button.disabled = count <= 0;
  button.textContent = count > 0
    ? `Clear All ${count}`
    : "Clear All";
}

function syncActivityNotificationButtons(count = getNewActivityNotificationCount()) {
  const badgeMarkup = renderNewCommentNotificationBadge(count, {
    countOnly: true,
    className: "ml-2 min-w-5 justify-center px-1.5 py-1 text-[0.54rem]",
  });

  [bannerActivityButton, desktopActivityButton, mobileMenuActivityButton].forEach((button) => {
    if (button) {
      const alignmentClass = button === mobileMenuActivityButton ? "justify-start" : "justify-center";
      const content = `<span class="inline-flex w-full items-center ${alignmentClass} gap-2"><span>Activity Feed</span>${badgeMarkup}</span>`;
      button.innerHTML = content;
    }
  });
}

function markClearingFeedNotificationCards(notificationKeys = []) {
  const keys = new Set(notificationKeys.map(String).filter(Boolean));

  if (keys.size === 0) {
    return false;
  }

  let marked = false;

  keys.forEach((key) => {
    getFeedNotificationCardElements(key).forEach((card) => {
      marked = true;
      card.style.transition = `border-color ${COMMENT_NOTIFICATION_FADE_MS}ms ease, background-color ${COMMENT_NOTIFICATION_FADE_MS}ms ease, box-shadow ${COMMENT_NOTIFICATION_FADE_MS}ms ease`;
      card.style.borderColor = "rgba(255,255,255,0.1)";
      card.style.backgroundColor = "rgba(0,0,0,0.24)";
      card.style.boxShadow = "none";

      getActivityNotificationElementsForKeys([key], card)
        .forEach((badge) => {
          badge.style.transition = `opacity ${COMMENT_NOTIFICATION_FADE_MS}ms ease`;
          badge.style.opacity = "0";
        });
    });
  });

  return marked;
}

function getFeedNotificationCardElements(notificationKey) {
  if (!notificationKey) {
    return [];
  }

  return Array.from(document.querySelectorAll("[data-feed-notification-key], [data-feed-notification-keys]"))
    .filter((card) => getNotificationKeysFromElement(card, "feed").includes(notificationKey));
}

function scheduleCommentNotificationViewportObserverSync() {
  if (commentNotificationViewportSyncFrame) {
    return;
  }

  commentNotificationViewportSyncFrame = window.requestAnimationFrame(() => {
    commentNotificationViewportSyncFrame = 0;
    syncCommentNotificationViewportObserver();
  });
}

function syncCommentNotificationViewportObserver() {
  if (commentNotificationViewportObserver) {
    commentNotificationViewportObserver.disconnect();
  }

  const notificationElements = Array.from(
    document.querySelectorAll("[data-activity-notification='true']")
  );

  if (!currentUser?.uid || notificationElements.length === 0 || typeof IntersectionObserver !== "function") {
    return;
  }

  commentNotificationViewportObserver = new IntersectionObserver(
    handleCommentNotificationViewportEntries,
    {
      root: null,
      threshold: 0.65,
    }
  );

  notificationElements.forEach((element) => {
    commentNotificationViewportObserver.observe(element);
  });
}

function handleCommentNotificationViewportEntries(entries) {
  entries.forEach((entry) => {
    if (!entry.isIntersecting || entry.intersectionRatio < 0.65) {
      return;
    }

    const notificationKeys = getNotificationKeysFromElement(entry.target, "activity")
      .filter((key) => !clearedMediaCommentNotificationKeys.has(key));

    if (notificationKeys.length === 0) {
      return;
    }

    commentNotificationViewportObserver?.unobserve(entry.target);
    scheduleViewportCommentNotificationClear(notificationKeys);
  });
}

function scheduleViewportCommentNotificationClear(notificationKeys) {
  const keys = Array.isArray(notificationKeys)
    ? notificationKeys.map(String).filter(Boolean)
    : [String(notificationKeys || "")].filter(Boolean);
  const timerKey = keys.slice().sort().join("|");

  if (!timerKey || commentNotificationViewportClearTimers.has(timerKey)) {
    return;
  }

  const timer = window.setTimeout(() => {
    commentNotificationViewportClearTimers.delete(timerKey);

    if (!areActivityNotificationKeysVisible(keys)) {
      scheduleCommentNotificationViewportObserverSync();
      return;
    }

    clearMediaCommentNotificationKeys(keys);
  }, COMMENT_NOTIFICATION_VIEWPORT_CLEAR_MS);

  commentNotificationViewportClearTimers.set(timerKey, timer);
}

function getNotificationKeysFromElement(element, namespace = "activity") {
  if (!element) {
    return [];
  }

  const listAttribute = namespace === "feed"
    ? "data-feed-notification-keys"
    : "data-activity-notification-keys";
  const keyAttribute = namespace === "feed"
    ? "data-feed-notification-key"
    : "data-activity-notification-key";
  const listValue = String(element.getAttribute(listAttribute) || "");
  const singleValue = String(element.getAttribute(keyAttribute) || "");

  return [...new Set(
    [
      ...listValue.split("|"),
      singleValue,
    ].map((key) => key.trim()).filter(Boolean)
  )];
}

function getActivityNotificationElementsForKeys(notificationKeys = [], root = document) {
  const keySet = new Set(notificationKeys.map(String).filter(Boolean));

  if (keySet.size === 0) {
    return [];
  }

  return Array.from(root.querySelectorAll("[data-activity-notification='true']"))
    .filter((element) => getNotificationKeysFromElement(element, "activity").some((key) => keySet.has(key)));
}

function areActivityNotificationKeysVisible(notificationKeys = []) {
  return getActivityNotificationElementsForKeys(notificationKeys).some(isElementMostlyInViewport);
}

function isElementMostlyInViewport(element) {
  if (!element || typeof element.getBoundingClientRect !== "function") {
    return false;
  }

  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const visibleWidth = Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0);
  const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
  const visibleArea = Math.max(0, visibleWidth) * Math.max(0, visibleHeight);
  const totalArea = Math.max(1, rect.width * rect.height);

  return visibleArea / totalArea >= 0.65;
}

function buildMediaCommentLikeKey(tripId, folderId, itemId, commentId) {
  return tripId && folderId && itemId && commentId
    ? `media-comment:${tripId}:${folderId}:${itemId}:${commentId}`
    : "";
}

function buildActivityLikeKey(threadOwnerUid, activityId) {
  return threadOwnerUid && activityId
    ? `activity-root:${threadOwnerUid}:${activityId}`
    : "";
}

function buildThreadReplyLikeKey(threadOwnerUid, activityId, replyId) {
  return threadOwnerUid && activityId && replyId
    ? `thread-reply:${threadOwnerUid}:${activityId}:${replyId}`
    : "";
}

function buildLikeTargetKeyFromPath(path) {
  const segments = String(path || "").split("/");

  if (segments.length === 8 && segments[0] === "trips" && segments[6] === "likes") {
    return buildMediaItemKey(segments[1], segments[3], segments[5]);
  }

  if (segments.length === 10 && segments[0] === "trips" && segments[6] === "comments" && segments[8] === "likes") {
    return buildMediaCommentLikeKey(segments[1], segments[3], segments[5], segments[7]);
  }

  if (segments.length === 6 && segments[0] === "users" && segments[4] === "likes") {
    return buildActivityLikeKey(segments[1], segments[3]);
  }

  if (segments.length === 8 && segments[0] === "users" && segments[4] === "replies" && segments[6] === "likes") {
    return buildThreadReplyLikeKey(segments[1], segments[3], segments[5]);
  }

  return "";
}

function normalizeFeedLikeEvent(likeDoc) {
  if (!likeDoc?.ref?.path) {
    return null;
  }

  const path = String(likeDoc.ref.path || "");
  const segments = path.split("/");
  const data = likeDoc.data ? likeDoc.data() : {};
  const targetKey = buildLikeTargetKeyFromPath(path);
  const baseEvent = {
    id: String(likeDoc.id || ""),
    actorUid: String(likeDoc.id || ""),
    targetKey,
    createdAtMs: coerceTimestampToMs(data?.createdAt, data?.createdAtMs),
  };

  if (segments.length === 8 && segments[0] === "trips" && segments[6] === "likes") {
    return {
      ...baseEvent,
      targetKind: "media-item",
      tripId: String(segments[1] || ""),
      folderId: String(segments[3] || ""),
      itemId: String(segments[5] || ""),
    };
  }

  if (segments.length === 10 && segments[0] === "trips" && segments[6] === "comments" && segments[8] === "likes") {
    return {
      ...baseEvent,
      targetKind: "media-comment",
      tripId: String(segments[1] || ""),
      folderId: String(segments[3] || ""),
      itemId: String(segments[5] || ""),
      commentId: String(segments[7] || ""),
    };
  }

  if (segments.length === 6 && segments[0] === "users" && segments[4] === "likes") {
    return {
      ...baseEvent,
      targetKind: "wall-post",
      threadOwnerUid: String(segments[1] || ""),
      activityId: String(segments[3] || ""),
    };
  }

  if (segments.length === 8 && segments[0] === "users" && segments[4] === "replies" && segments[6] === "likes") {
    return {
      ...baseEvent,
      targetKind: "thread-reply",
      threadOwnerUid: String(segments[1] || ""),
      activityId: String(segments[3] || ""),
      replyId: String(segments[5] || ""),
    };
  }

  return null;
}

// -----------------------------------------------------------------------------
// Social Rendering And Action Contexts
// -----------------------------------------------------------------------------
// Shared renderers build comment, wall-post, reply, and feed cards. Context
// builders/readers convert DOM data attributes back into Firestore paths.
function renderVideoPreviewComments(previewState = getCurrentVideoPreviewState()) {
  const context = buildMediaCommentContext(previewState);
  const comments = context ? mediaCommentsByKey.get(context.key) || [] : [];
  syncActiveVideoPreviewThread(previewState, comments);
  const selectedThreadId = currentThreadSurface === "preview"
    ? String(previewState?.threadCommentId || "")
    : "";
  const visibleComments = selectedThreadId
    ? comments.filter((comment) => comment.id !== selectedThreadId)
    : comments;
  const canComment = Boolean(context && db && currentUser?.uid && canUploadMedia());

  if (videoPreviewCommentForm) {
    videoPreviewCommentForm.classList.toggle("hidden", !(canComment && videoPreviewCommentComposerOpen));
  }

  if (videoPreviewCommentSubmit) {
    videoPreviewCommentSubmit.disabled = false;
  }

 if (videoPreviewCommentToggleButton) {
  const commentLabel = videoPreviewCommentComposerOpen ? "Close Comment" : "Comment";
  const commentCount = comments.length;
  const commentCountLabel = buildCountLabel(commentCount, "COMMENT");

  videoPreviewCommentToggleButton.classList.toggle("hidden", !context);

  videoPreviewCommentToggleButton.innerHTML = `
<span class="text-stone-300/70">
    ${escapeHtml(commentCountLabel)}
  </span>
  <span class="ml-2 border-l border-current/20 pl-2">
    ${escapeHtml(commentLabel)}
  </span>
  `;

  videoPreviewCommentToggleButton.className = [
    videoPreviewCommentToggleButton.classList.contains("hidden") ? "hidden" : "",
    "shrink-0 inline-flex items-center justify-center border border-white/12 bg-white/[0.03] px-3 py-2 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.66rem] uppercase tracking-[0.18em] text-stone-100 transition hover:border-white/30 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-45",
  ].join(" ").trim();

  videoPreviewCommentToggleButton.disabled = false;
}

  if (videoPreviewCommentsList) {
    videoPreviewCommentsList.innerHTML = !context
      ? ""
      : visibleComments.length > 0
        ? visibleComments
            .map((comment) => renderMediaComment(comment))
            .join("")
        : selectedThreadId && comments.length > 0
          ? ""
        : renderEmptySocialState("NO COMMENTS YET.");
  }

  scheduleCommentNotificationViewportObserverSync();

  renderVideoPreviewInteractionBar(previewState);
  renderVideoPreviewThreadPanel(previewState);

  if (!context) {
    setVideoPreviewCommentStatus("");
    return;
  }

  if (comments.length > 0) {
    setVideoPreviewCommentStatus(buildCountLabel(comments.length, "COMMENT"));
    return;
  }

  setVideoPreviewCommentStatus(canComment ? "NO COMMENTS YET." : "SIGN IN TO COMMENT.");
}

function renderVideoPreviewInteractionBar(previewState = getCurrentVideoPreviewState()) {
  const item = previewState?.currentItem || null;
  const counts = item
    ? getMediaItemInteractionCounts(item, previewState.tripId, previewState.folderId)
    : null;
  const liked = Boolean(counts?.itemKey && isTargetLikedByCurrentUser(counts.itemKey));
if (videoPreviewSocialSummary) {
  videoPreviewSocialSummary.innerHTML = "";
}


  if (videoPreviewLikeButton) {
  const likeLabel = liked ? "Liked" : "Like";
  const likeCountLabel = counts
    ? buildCountLabel(counts.likeCount, "LIKE")
    : buildCountLabel(0, "LIKE");

videoPreviewLikeButton.innerHTML = `
  <span class="text-stone-300/70">
    ${escapeHtml(likeCountLabel)}
  </span>
  <span class="ml-2 border-l border-current/20 pl-2">
    ${escapeHtml(likeLabel)}
  </span>
`;

  videoPreviewLikeButton.className = liked
    ? "shrink-0 inline-flex items-center justify-center border border-sky-200/45 bg-sky-100/[0.08] px-3 py-2 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.66rem] uppercase tracking-[0.18em] text-sky-50 transition hover:border-sky-100/65 hover:bg-sky-100/[0.14] disabled:cursor-not-allowed disabled:opacity-45"
    : "shrink-0 inline-flex items-center justify-center border border-white/12 bg-white/[0.03] px-3 py-2 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.66rem] uppercase tracking-[0.18em] text-stone-100 transition hover:border-white/30 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-45";

  videoPreviewLikeButton.disabled = !counts?.itemKey;
}
}

function getSocialEntryActor(entry) {
  return {
    label: normalizeSocialLabel(entry?.authorLabel || entry?.actorLabel),
    routeId: normalizeRouteId(entry?.authorRouteId || entry?.actorRouteId),
    photoURL: String(entry?.authorPhotoURL || entry?.actorPhotoURL || ""),
  };
}

function renderSocialEntryContent(entry) {
  return `${renderSocialEntryBody(entry?.body)}${renderSocialAttachment(entry)}`;
}

function renderEditableSocialEntryContent(entry) {
  if (entry?.type === "media-comment" && isEditingSocialComment(entry)) {
    return renderSocialCommentEditForm(entry);
  }

  if (entry?.type === "wall-post" && isEditingWallPost(entry)) {
    return renderWallPostEditForm(entry);
  }

  if (entry?.type === "thread-reply" && isEditingThreadReply(entry)) {
    return renderThreadReplyEditForm(entry);
  }

  return renderSocialEntryContent(entry);
}

function renderSocialEntryTypeControls(entry) {
  if (entry?.type === "media-comment") {
    return renderSocialCommentControls(entry);
  }

  if (entry?.type === "wall-post") {
    return renderWallPostControls(entry);
  }

  if (entry?.type === "thread-reply") {
    return renderThreadReplyControls(entry);
  }

  return "";
}

function renderSocialEntryCard(entry, options = {}) {
  const actor = getSocialEntryActor(entry);
  const actorMarkup = renderSocialActorLink(
    actor.label,
    actor.routeId,
    "text-stone-100 transition hover:text-white hover:underline"
  );
  const articleClass = [
    "border border-white/10 bg-black/24 p-3 sm:p-4",
    options.interactive ? "cursor-pointer transition hover:border-white/22 hover:bg-black/32" : "",
    options.cardClass || "",
  ]
    .filter(Boolean)
    .join(" ");
  const headerMetaMarkup = [
    `<span class="text-stone-400/58">${escapeHtml(formatActivityTime(entry?.createdAtMs))}</span>`,
    entry?.editedAtMs ? `<span class="text-stone-400/42">EDITED</span>` : "",
    options.headerMetaMarkup || "",
  ]
    .filter(Boolean)
    .join("");
  const articleAttrs = options.articleAttrs ? ` ${options.articleAttrs}` : "";
  const articleTitle = options.title ? ` title="${escapeHtml(options.title)}"` : "";
  const wrapperStart = options.wrapperClass ? `<div class="${options.wrapperClass}">` : "";
  const wrapperEnd = options.wrapperClass ? "</div>" : "";

  return `
    ${wrapperStart}
    <article class="${articleClass}"${articleAttrs}${articleTitle}>
      <div class="flex items-start gap-3">
        <img src="${escapeHtml(getSocialPhotoUrl(actor.photoURL))}" alt="${escapeHtml(actor.label)}" class="h-10 w-10 shrink-0 border border-white/10 bg-black object-cover object-center">
        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.62rem] uppercase tracking-[0.16em]">
              ${actorMarkup}
              ${headerMetaMarkup}
            </div>
            ${options.controlsMarkup || ""}
          </div>
          ${options.actionLabel ? `<p class="mt-1 break-words font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.58rem] uppercase tracking-[0.16em] text-stone-300/58">${escapeHtml(options.actionLabel)}</p>` : ""}
          ${options.bodyMarkup ?? ""}
          ${options.secondaryMarkup ?? ""}
          ${options.interactionMarkup ?? ""}
          ${options.footerMarkup ?? ""}
        </div>
      </div>
    </article>
    ${wrapperEnd}
  `;
}

function renderMediaComment(comment, options = {}) {
  const context = buildThreadActionContext(comment);
  const interactionMarkup = renderSocialInteractionBar(comment, { includeReplyCount: false });
  const highlighted = isHighlightedPreviewComment(comment);
  const highlightAttrs = highlighted ? ' data-new-comment="true"' : "";
  const headerMetaMarkup = [
    highlighted ? renderNewCommentNotificationBadge(1, { label: "NEW" }) : "",
    renderUnreadMediaReplyNotificationBadge(comment),
  ].filter(Boolean).join("");
  const replyButtonMarkup = context.threadOwnerUid && context.activityId
    ? `
      <div class="mt-3">
        <button
          type="button"
          data-action="open-preview-thread"
          ${renderThreadActionAttributes(context)}
          class="${getSocialActionButtonClass()}"
        >
          Reply
        </button>
      </div>
    `
    : "";
  return renderSocialEntryCard(comment, {
    articleAttrs: `data-media-comment-id="${escapeHtml(comment.id)}"${highlightAttrs}`,
    cardClass: highlighted || getNewMediaReplyNotificationsForRoot(comment).length > 0
      ? "ring-1 ring-red-300/55 bg-red-500/[0.08]"
      : "",
    headerMetaMarkup,
    controlsMarkup: renderSocialEntryTypeControls(comment),
    bodyMarkup: renderEditableSocialEntryContent(comment),
    interactionMarkup,
    footerMarkup: replyButtonMarkup,
  });
}

function isHighlightedPreviewComment(entry) {
  return Boolean(
    entry?.type === "media-comment" &&
      entry?.id &&
      currentVideoPreviewNotificationCommentIds.has(entry.id)
  );
}

function syncProfileActivitySubscription(userId) {
  const nextUserId = String(userId || "");

  if (!nextUserId || !db || !runtimeConfig?.collections?.users) {
    profileActivityUnsubscribe?.();
    profileActivityUnsubscribe = null;
    currentProfileActivityUid = "";
    return;
  }

  if (currentProfileActivityUid === nextUserId) {
    return;
  }

  profileActivityUnsubscribe?.();
  currentProfileActivityUid = nextUserId;

  if (!profileActivityByUser.has(nextUserId)) {
    profileActivityByUser.set(nextUserId, []);
  }

  const activityQuery = query(
    collection(db, runtimeConfig.collections.users, nextUserId, "activity"),
    orderBy("createdAtMs", "desc")
  );

  profileActivityUnsubscribe = onSnapshot(
    activityQuery,
    (snapshot) => {
      profileActivityByUser.set(
        nextUserId,
        snapshot.docs.map((activityDoc) =>
          normalizeActivityEntry({
            id: activityDoc.id,
            activityOwnerUid: nextUserId,
            ...activityDoc.data(),
          })
        )
      );
      const profileView = getActiveProfileView();
      const friend = profileView?.state === "ready" ? profileView.friend : null;

      if (friend?.uid === nextUserId) {
        renderProfileActivityPanel(
          friend,
          true,
          friend.uid === currentUser?.uid,
          profileView
        );
      }
    },
    (error) => {
      setProfileActivityStatus(getFriendlyFirestoreMessage(error).toUpperCase());
    }
  );
}

function renderProfileActivityPanel(friend, isReady, isSelf, profileView = null) {
  const entries = isReady && friend?.uid ? profileActivityByUser.get(friend.uid) || [] : [];
  const canPost = Boolean(isReady && db && currentUser?.uid && canUploadMedia());

  if (profileActivityForm) {
    profileActivityForm.classList.toggle("hidden", !canPost);
  }

  if (profileActivitySubmit) {
    profileActivitySubmit.disabled = false;
  }

  if (profileActivityList) {
    profileActivityList.innerHTML = !isReady
      ? renderEmptySocialState(getProfileActivityPlaceholder(profileView))
      : entries.length > 0
        ? entries.map((entry) => renderActivityEntry(entry, friend, isSelf)).join("")
        : renderEmptySocialState("NO WALL ACTIVITY YET.");
  }

  scheduleCommentNotificationViewportObserverSync();

  if (!isReady) {
    setProfileActivityStatus(getProfileActivityPlaceholder(profileView));
    return;
  }

  if (entries.length > 0) {
    setProfileActivityStatus(buildCountLabel(entries.length, "ACTIVITY"));
    return;
  }

  setProfileActivityStatus(canPost ? "WALL OPEN." : "SIGN IN TO WRITE ON WALL.");
}

function getProfileActivityPlaceholder(profileView) {
  if (profileView?.state === "signin-required") {
    return STRINGS.profile.signInRequired;
  }

  if (profileView?.state === "not-found") {
    return STRINGS.profile.notFound;
  }

  if (profileView?.state === "archive") {
    return "";
  }

  return STRINGS.profile.loading;
}

function renderActivityEntry(entry, profileFriend, isSelf = false) {
  const actionLabel = buildActivityActionLabel(entry, profileFriend, isSelf);
  const notificationMarkup = renderUnreadActivityNotificationBadge(entry, { label: "NEW" });
  const articleActionAttrs = entry.type === "media-comment"
    ? renderActivitySourceAttributes(entry)
    : entry.type === "wall-post"
      ? renderWallPostThreadAttributes(entry)
    : "";
  const wallTargetLinkMarkup = entry.type === "wall-post" ? renderWallTargetLink(entry) : "";
  const interactionMarkup = renderSocialInteractionBar(entry);
  return renderSocialEntryCard(entry, {
    articleAttrs: articleActionAttrs,
    interactive: entry.type === "media-comment" || entry.type === "wall-post",
    title: entry.type === "media-comment"
      ? "Open source item and thread"
      : entry.type === "wall-post"
        ? "Open wall post thread"
        : "",
    controlsMarkup: renderSocialEntryTypeControls(entry),
    headerMetaMarkup: notificationMarkup,
    actionLabel,
    bodyMarkup: renderEditableSocialEntryContent(entry),
    interactionMarkup,
    footerMarkup: wallTargetLinkMarkup,
  });
}

function buildActivityActionLabel(entry, profileFriend, isSelf = false) {
  if (entry.type === "media-comment") {
    const itemName = entry.itemName ? ` // ${entry.itemName}` : "";
    const sourceLabel = entry.sourceLabel ? ` // ${entry.sourceLabel}` : "";
    return `COMMENTED ON MEDIA${itemName}${sourceLabel}`;
  }

  if (entry.type === "wall-post") {
    const targetLabel = normalizeSocialLabel(
      entry.targetUserLabel || getFriendLabel(getFriendByUid(entry.targetUserUid))
    );

    if (entry.targetUserUid && profileFriend?.uid && entry.targetUserUid !== profileFriend.uid) {
      return `WROTE ON ${targetLabel.toUpperCase()}'S WALL`;
    }

    if (entry.actorUid && entry.actorUid === profileFriend?.uid) {
      return isSelf ? "POSTED ON YOUR WALL" : "POSTED ON THEIR WALL";
    }

    if (isSelf) {
      return "WROTE ON YOUR WALL";
    }

    return `WROTE ON ${getFriendLabel(profileFriend).toUpperCase()}'S WALL`;
  }

  return "PROFILE ACTIVITY";
}

function normalizeMediaComment(comment) {
  return {
    id: String(comment?.id || ""),
    type: "media-comment",
    body: normalizeSocialBody(comment?.body),
    authorUid: String(comment?.authorUid || comment?.actorUid || ""),
    authorLabel: normalizeSocialLabel(comment?.authorLabel || comment?.actorLabel),
    authorRouteId: normalizeRouteId(comment?.authorRouteId || comment?.actorRouteId),
    authorPhotoURL: String(comment?.authorPhotoURL || comment?.actorPhotoURL || ""),
    attachmentURL: String(comment?.attachmentURL || ""),
    attachmentStoragePath: String(comment?.attachmentStoragePath || ""),
    attachmentMimeType: String(comment?.attachmentMimeType || ""),
    attachmentName: String(comment?.attachmentName || ""),
    tripId: String(comment?.tripId || ""),
    folderId: String(comment?.folderId || ""),
    itemId: String(comment?.itemId || ""),
    itemName: String(comment?.itemName || ""),
    sourceLabel: String(comment?.sourceLabel || ""),
    likeCount: Number(comment?.likeCount || 0),
    createdAtMs: coerceTimestampToMs(comment?.createdAt, comment?.createdAtMs),
    editedAtMs: coerceTimestampToMs(comment?.editedAt, comment?.editedAtMs),
  };
}

function normalizeActivityEntry(entry) {
  return {
    id: String(entry?.id || ""),
    type: String(entry?.type || "wall-post"),
    body: normalizeSocialBody(entry?.body),
    actorUid: String(entry?.actorUid || ""),
    actorLabel: normalizeSocialLabel(entry?.actorLabel),
    actorRouteId: normalizeRouteId(entry?.actorRouteId),
    actorPhotoURL: String(entry?.actorPhotoURL || ""),
    activityOwnerUid: String(entry?.activityOwnerUid || ""),
    targetUserUid: String(entry?.targetUserUid || ""),
    targetUserLabel: normalizeSocialLabel(entry?.targetUserLabel),
    tripId: String(entry?.tripId || ""),
    folderId: String(entry?.folderId || ""),
    itemId: String(entry?.itemId || ""),
    itemName: String(entry?.itemName || ""),
    sourceLabel: String(entry?.sourceLabel || ""),
    attachmentURL: String(entry?.attachmentURL || ""),
    attachmentStoragePath: String(entry?.attachmentStoragePath || ""),
    attachmentMimeType: String(entry?.attachmentMimeType || ""),
    attachmentName: String(entry?.attachmentName || ""),
    likeCount: Number(entry?.likeCount || 0),
    createdAtMs: coerceTimestampToMs(entry?.createdAt, entry?.createdAtMs),
    editedAtMs: coerceTimestampToMs(entry?.editedAt, entry?.editedAtMs),
  };
}

function buildMediaItemLikeContext(previewState = getCurrentVideoPreviewState()) {
  const item = previewState?.currentItem || null;
  const sourceFolderId = resolveItemSourceFolderId(item, previewState?.folderId);

  if (!previewState?.tripId || !sourceFolderId || !item?.id) {
    return null;
  }

  return {
    targetKind: "media-item",
    targetKey: buildMediaItemKey(previewState.tripId, sourceFolderId, item.id),
    tripId: previewState.tripId,
    folderId: sourceFolderId,
    itemId: item.id,
    commentId: "",
    threadOwnerUid: "",
    activityId: "",
    actorUid: "",
    replyId: "",
  };
}

function normalizeThreadRootEntry(entry) {
  const type = String(entry?.type || "media-comment");

  if (type === "wall-post") {
    return normalizeActivityEntry({ ...entry, type });
  }

  const normalizedComment = normalizeMediaComment({ ...entry, type });

  return {
    ...normalizedComment,
    actorUid: String(entry?.actorUid || normalizedComment.authorUid || ""),
    actorLabel: normalizeSocialLabel(entry?.actorLabel || normalizedComment.authorLabel),
    actorRouteId: normalizeRouteId(entry?.actorRouteId || normalizedComment.authorRouteId),
    actorPhotoURL: String(entry?.actorPhotoURL || normalizedComment.authorPhotoURL || ""),
    targetUserUid: String(entry?.targetUserUid || ""),
    targetUserLabel: normalizeSocialLabel(entry?.targetUserLabel),
  };
}

function normalizeThreadReply(reply) {
  return {
    id: String(reply?.id || ""),
    type: "thread-reply",
    parentType: String(reply?.parentType || ""),
    body: normalizeSocialBody(reply?.body),
    actorUid: String(reply?.actorUid || ""),
    actorLabel: normalizeSocialLabel(reply?.actorLabel),
    actorRouteId: normalizeRouteId(reply?.actorRouteId),
    actorPhotoURL: String(reply?.actorPhotoURL || ""),
    attachmentURL: String(reply?.attachmentURL || ""),
    attachmentStoragePath: String(reply?.attachmentStoragePath || ""),
    attachmentMimeType: String(reply?.attachmentMimeType || ""),
    attachmentName: String(reply?.attachmentName || ""),
    threadOwnerUid: String(reply?.threadOwnerUid || ""),
    activityId: String(reply?.activityId || ""),
    likeCount: Number(reply?.likeCount || 0),
    createdAtMs: coerceTimestampToMs(reply?.createdAt, reply?.createdAtMs),
    editedAtMs: coerceTimestampToMs(reply?.editedAt, reply?.editedAtMs),
  };
}

function renderSocialLikeButton(entry) {
  const context = buildSocialLikeActionContext(entry);

  if (!context?.targetKey) {
    return "";
  }

  const liked = isTargetLikedByCurrentUser(context.targetKey);

  return `
    <button
      type="button"
      data-action="toggle-social-like"
      ${renderSocialLikeActionAttributes(context)}
      class="${getSocialLikeButtonClass(liked)}"
    >
      ${liked ? "Liked" : "Like"}
    </button>
  `;
}

function renderSocialInteractionBar(entry, options = {}) {
  const likeContext = buildSocialLikeActionContext(entry);
  const likeButtonMarkup = renderSocialLikeButton(entry);
  const likeBadgeMarkup = likeContext?.targetKey
    ? renderSocialMetricBadge(getLikeCountForTargetKey(likeContext.targetKey, entry?.likeCount), "LIKE")
    : "";
  const shouldShowReplyCount = options.includeReplyCount !== false && entry?.type !== "thread-reply";
  const replyBadgeMarkup = shouldShowReplyCount
    ? renderSocialMetricBadge(
        getReplyCountForEntry(entry),
        "REPLY",
        getReplyCountForEntry(entry) > 0 ? "highlight" : "default"
      )
    : "";

  if (!likeButtonMarkup && !likeBadgeMarkup && !replyBadgeMarkup) {
    return "";
  }

  return `
    <div class="mt-3 flex flex-wrap items-center gap-1.5">
      ${likeButtonMarkup}
      ${likeBadgeMarkup}
      ${replyBadgeMarkup}
    </div>
  `;
}

function renderSocialEntryControls(options = {}) {
  const canEdit = Boolean(options.canEdit);
  const canDelete = Boolean(options.canDelete);

  if (!canEdit && !canDelete) {
    return "";
  }

  const buttonClass = getSocialMenuItemButtonClass();
  const deleteButtonClass = getSocialMenuItemButtonClass("delete");
  const contextAttrs = options.contextAttrs || "";
  const menuLabel = escapeHtml(options.menuLabel || "Entry actions");

  return `
    <details class="relative shrink-0">
      <summary class="flex h-7 w-7 cursor-pointer list-none items-center justify-center border border-white/10 bg-black/40 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.68rem] leading-none tracking-[0.08em] text-stone-200 transition hover:border-white/30 hover:bg-white/[0.08] [&::-webkit-details-marker]:hidden" aria-label="${menuLabel}">
        ...
      </summary>
      <div class="absolute right-0 top-[calc(100%+0.35rem)] z-30 w-28 border border-white/12 bg-neutral-950/98 p-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.45)]">
        ${
          canEdit
            ? `
              <button type="button" data-action="${escapeHtml(options.editAction || "")}" ${contextAttrs} class="${buttonClass}">
                Edit
              </button>
            `
            : ""
        }
        ${
          canDelete
            ? `
              <button type="button" data-action="${escapeHtml(options.deleteAction || "")}" ${contextAttrs} class="${deleteButtonClass}">
                Delete
              </button>
            `
            : ""
        }
      </div>
    </details>
  `;
}

function renderSocialCommentControls(entry) {
  if (entry?.type !== "media-comment") {
    return "";
  }

  const context = buildSocialCommentActionContext(entry);
  const canEdit = canEditSocialCommentContext(context);
  const canDelete = canDeleteSocialCommentContext(context);

  return renderSocialEntryControls({
    canEdit,
    canDelete,
    contextAttrs: renderSocialCommentActionAttributes(context),
    editAction: "edit-comment",
    deleteAction: "delete-comment",
    menuLabel: "Comment actions",
  });
}

function renderWallPostControls(entry) {
  if (entry?.type !== "wall-post") {
    return "";
  }

  const context = buildWallPostActionContext(entry);
  const canEdit = canEditWallPostContext(context);
  const canDelete = canDeleteWallPostContext(context);

  return renderSocialEntryControls({
    canEdit,
    canDelete,
    contextAttrs: renderWallPostActionAttributes(context),
    editAction: "edit-wall-post",
    deleteAction: "delete-wall-post",
    menuLabel: "Wall post actions",
  });
}

function renderThreadReplyControls(entry) {
  if (entry?.type !== "thread-reply") {
    return "";
  }

  const context = buildThreadReplyActionContext(entry);
  const canEdit = canEditThreadReplyContext(context);
  const canDelete = canDeleteThreadReplyContext(context);

  return renderSocialEntryControls({
    canEdit,
    canDelete,
    contextAttrs: renderThreadReplyActionAttributes(context),
    editAction: "edit-thread-reply",
    deleteAction: "delete-thread-reply",
    menuLabel: "Reply actions",
  });
}

function renderThreadRootEntry(entry, options = {}) {
  const showActionLabel = options.showActionLabel !== false;
  const actionLabel = showActionLabel ? buildThreadRootActionLabel(entry) : "";
  const interactionMarkup = renderSocialInteractionBar(entry, { includeReplyCount: false });
  const highlighted = isHighlightedPreviewComment(entry);
  const highlightAttrs = highlighted ? ' data-new-comment="true"' : "";
  const headerMetaMarkup = [
    highlighted ? renderNewCommentNotificationBadge(1, { label: "NEW" }) : "",
    renderUnreadMediaReplyNotificationBadge(entry),
  ].filter(Boolean).join("");
  return renderSocialEntryCard(entry, {
    articleAttrs: `data-thread-root-entry="${escapeHtml(entry.id)}"${highlightAttrs}`,
    cardClass: highlighted || getNewMediaReplyNotificationsForRoot(entry).length > 0
      ? "ring-1 ring-red-300/55 bg-red-500/[0.08]"
      : "",
    headerMetaMarkup,
    controlsMarkup: renderSocialEntryTypeControls(entry),
    actionLabel,
    bodyMarkup: renderEditableSocialEntryContent(entry),
    interactionMarkup,
  });
}

function renderThreadReply(reply) {
  const interactionMarkup = renderSocialInteractionBar(reply, { includeReplyCount: false });
  return renderSocialEntryCard(reply, {
    wrapperClass: "ml-4 sm:ml-6",
    controlsMarkup: renderSocialEntryTypeControls(reply),
    bodyMarkup: renderEditableSocialEntryContent(reply),
    interactionMarkup,
  });
}

function buildThreadRootActionLabel(entry) {
  if (entry?.type === "media-comment") {
    const itemName = entry.itemName ? ` // ${entry.itemName}` : "";
    const sourceLabel = entry.sourceLabel ? ` // ${entry.sourceLabel}` : "";
    return `COMMENTED ON MEDIA${itemName}${sourceLabel}`;
  }

  if (entry?.type === "wall-post") {
    const targetFriend = getFriendByUid(entry.targetUserUid);
    const targetLabel = normalizeSocialLabel(
      entry.targetUserLabel || getFriendLabel(targetFriend)
    );
    return `WROTE ON ${targetLabel.toUpperCase()}'S WALL`;
  }

  return "THREAD";
}

function buildThreadTitle(entry) {
  if (entry?.type === "wall-post") {
    return "Wall Thread";
  }

  if (entry?.type === "media-comment") {
    return "Comment Thread";
  }

  return "Comment Thread";
}

function buildThreadContextLabel(entry) {
  if (entry?.type === "media-comment") {
    const parts = [entry.itemName, entry.sourceLabel].filter(Boolean);
    return parts.join(" // ");
  }

  if (entry?.type === "wall-post") {
    const targetFriend = getFriendByUid(entry.targetUserUid);
    const targetLabel = normalizeSocialLabel(
      entry.targetUserLabel || getFriendLabel(targetFriend)
    );
    return `WALL // ${targetLabel}`;
  }

  return "";
}

function buildPreviewThreadContextLabel(entry) {
  if (!entry) {
    return "";
  }

  const actorLabel = normalizeSocialLabel(entry.actorLabel);
  const sourceLabel = buildThreadContextLabel(entry);
  const parts = [`COMMENT BY ${actorLabel.toUpperCase()}`];

  if (sourceLabel) {
    parts.push(sourceLabel);
  }

  return parts.join(" // ");
}

function renderSocialEntryEditForm(options = {}) {
  const buttonClass = getSocialActionButtonClass();
  const deleteButtonClass = getSocialActionButtonClass("delete");

  return `
    <form data-action="${escapeHtml(options.formAction || "")}" ${options.contextAttrs || ""} class="mt-3 space-y-2">
      <textarea
        name="${escapeHtml(options.textareaName || "commentBody")}"
        rows="3"
        maxlength="${MAX_SOCIAL_BODY_LENGTH}"
        autocapitalize="off"
        spellcheck="true"
        class="w-full resize-y border border-white/12 bg-black/40 px-3 py-3 font-['Arial_Narrow','Helvetica_Neue',Arial,sans-serif] text-[0.96rem] font-semibold leading-5 tracking-[0.03em] text-stone-100 outline-none transition placeholder:text-stone-400/40 focus:border-white/35"
      >${escapeHtml(options.body || "")}</textarea>
      <div class="flex flex-wrap items-center gap-1.5">
        <button type="submit" class="${buttonClass}">Save</button>
        <button type="button" data-action="${escapeHtml(options.cancelAction || "")}" class="${deleteButtonClass}">Cancel</button>
      </div>
    </form>
  `;
}

function renderSocialCommentEditForm(entry) {
  const context = buildSocialCommentActionContext(entry);

  return renderSocialEntryEditForm({
    formAction: "save-comment-edit",
    contextAttrs: renderSocialCommentActionAttributes(context),
    textareaName: "commentBody",
    body: entry.body || "",
    cancelAction: "cancel-comment-edit",
  });
}

function renderWallPostEditForm(entry) {
  const context = buildWallPostActionContext(entry);

  return renderSocialEntryEditForm({
    formAction: "save-wall-post-edit",
    contextAttrs: renderWallPostActionAttributes(context),
    textareaName: "wallPostBody",
    body: entry.body || "",
    cancelAction: "cancel-wall-post-edit",
  });
}

function renderThreadReplyEditForm(entry) {
  const context = buildThreadReplyActionContext(entry);

  return renderSocialEntryEditForm({
    formAction: "save-thread-reply-edit",
    contextAttrs: renderThreadReplyActionAttributes(context),
    textareaName: "threadReplyBody",
    body: entry.body || "",
    cancelAction: "cancel-thread-reply-edit",
  });
}

function buildSocialCommentActionContext(entry) {
  const authorUid = getSocialCommentAuthorUid(entry);

  return {
    commentId: String(entry?.id || ""),
    tripId: String(entry?.tripId || ""),
    folderId: String(entry?.folderId || ""),
    itemId: String(entry?.itemId || ""),
    authorUid,
    activityUserId: getSocialCommentActivityUserId(entry),
    attachmentStoragePath: String(entry?.attachmentStoragePath || ""),
    hasAttachment: Boolean(entry?.attachmentURL || entry?.attachmentStoragePath),
  };
}

function buildWallPostActionContext(entry) {
  return {
    activityId: String(entry?.id || ""),
    actorUid: String(entry?.actorUid || ""),
    targetUserUid: String(entry?.targetUserUid || ""),
    attachmentStoragePath: String(entry?.attachmentStoragePath || ""),
    hasAttachment: Boolean(entry?.attachmentURL || entry?.attachmentStoragePath),
  };
}

function buildThreadReplyActionContext(entry) {
  return {
    replyId: String(entry?.id || ""),
    threadOwnerUid: String(entry?.threadOwnerUid || ""),
    activityId: String(entry?.activityId || ""),
    actorUid: String(entry?.actorUid || ""),
    attachmentStoragePath: String(entry?.attachmentStoragePath || ""),
    hasAttachment: Boolean(entry?.attachmentURL || entry?.attachmentStoragePath),
  };
}

function buildThreadActionContext(entry) {
  return {
    threadOwnerUid: getThreadOwnerUid(entry),
    activityId: String(entry?.id || ""),
  };
}

function buildSocialLikeActionContext(entry) {
  if (entry?.type === "media-comment") {
    return {
      targetKind: "media-comment",
      targetKey: buildMediaCommentLikeKey(entry.tripId, entry.folderId, entry.itemId, entry.id),
      tripId: String(entry?.tripId || ""),
      folderId: String(entry?.folderId || ""),
      itemId: String(entry?.itemId || ""),
      commentId: String(entry?.id || ""),
      threadOwnerUid: String(entry?.authorUid || entry?.actorUid || ""),
      activityId: String(entry?.id || ""),
      actorUid: String(entry?.authorUid || entry?.actorUid || ""),
      replyId: "",
    };
  }

  if (entry?.type === "wall-post") {
    return {
      targetKind: "wall-post",
      targetKey: buildActivityLikeKey(entry.targetUserUid, entry.id),
      tripId: "",
      folderId: "",
      itemId: "",
      commentId: "",
      threadOwnerUid: String(entry?.targetUserUid || ""),
      activityId: String(entry?.id || ""),
      actorUid: String(entry?.actorUid || ""),
      replyId: "",
    };
  }

  if (entry?.type === "thread-reply") {
    return {
      targetKind: "thread-reply",
      targetKey: buildThreadReplyLikeKey(entry.threadOwnerUid, entry.activityId, entry.id),
      tripId: "",
      folderId: "",
      itemId: "",
      commentId: "",
      threadOwnerUid: String(entry?.threadOwnerUid || ""),
      activityId: String(entry?.activityId || ""),
      actorUid: String(entry?.actorUid || ""),
      replyId: String(entry?.id || ""),
    };
  }

  return null;
}

function renderWallPostThreadAttributes(entry) {
  if (entry?.type !== "wall-post") {
    return "";
  }

  const context = buildThreadActionContext(entry);

  if (!context.threadOwnerUid || !context.activityId) {
    return "";
  }

  return `data-action="open-thread" ${renderThreadActionAttributes(context)}`;
}

function renderWallTargetLink(entry) {
  if (entry?.type !== "wall-post") {
    return "";
  }

  const targetUserUid = String(entry?.targetUserUid || "");

  if (!targetUserUid) {
    return "";
  }

  const targetFriend = getFriendByUid(targetUserUid);
  const targetHref = targetUserUid === currentUser?.uid
    ? resolveRoutePath(getOwnProfileRoute())
    : targetFriend?.routeId
      ? buildProfilePath(targetFriend.routeId)
      : "";

  if (!targetHref) {
    return "";
  }

  const targetLabel = normalizeSocialLabel(
    entry?.targetUserLabel || getFriendLabel(targetFriend)
  );

  return `
    <div class="mt-3">
      <a
        href="${escapeHtml(targetHref)}"
        class="${getSocialActionButtonClass()}"
        title="Open ${escapeHtml(targetLabel)}'s wall"
      >
        View Wall
      </a>
    </div>
  `;
}

function renderActivitySourceAttributes(entry) {
  return [
    ["data-action", "open-activity-source"],
    ["data-trip-id", String(entry?.tripId || "")],
    ["data-folder-id", String(entry?.folderId || "")],
    ["data-item-id", String(entry?.itemId || "")],
    ["data-thread-owner-uid", String(getThreadOwnerUid(entry) || "")],
    ["data-activity-id", String(entry?.id || "")],
  ]
    .map(([name, value]) => `${name}="${escapeHtml(value)}"`)
    .join(" ");
}

function renderSocialLikeActionAttributes(context) {
  return [
    ["data-target-kind", context?.targetKind || ""],
    ["data-target-key", context?.targetKey || ""],
    ["data-trip-id", context?.tripId || ""],
    ["data-folder-id", context?.folderId || ""],
    ["data-item-id", context?.itemId || ""],
    ["data-comment-id", context?.commentId || ""],
    ["data-thread-owner-uid", context?.threadOwnerUid || ""],
    ["data-activity-id", context?.activityId || ""],
    ["data-actor-uid", context?.actorUid || ""],
    ["data-reply-id", context?.replyId || ""],
  ]
    .map(([name, value]) => `${name}="${escapeHtml(String(value || ""))}"`)
    .join(" ");
}

function renderSocialCommentActionAttributes(context) {
  return [
    ["data-comment-id", context.commentId],
    ["data-trip-id", context.tripId],
    ["data-folder-id", context.folderId],
    ["data-item-id", context.itemId],
    ["data-author-uid", context.authorUid],
    ["data-activity-user-id", context.activityUserId],
    ["data-attachment-storage-path", context.attachmentStoragePath],
    ["data-has-attachment", context.hasAttachment ? "true" : "false"],
  ]
    .map(([name, value]) => `${name}="${escapeHtml(value)}"`)
    .join(" ");
}

function renderWallPostActionAttributes(context) {
  return [
    ["data-activity-id", context.activityId],
    ["data-actor-uid", context.actorUid],
    ["data-target-user-uid", context.targetUserUid],
    ["data-attachment-storage-path", context.attachmentStoragePath],
    ["data-has-attachment", context.hasAttachment ? "true" : "false"],
  ]
    .map(([name, value]) => `${name}="${escapeHtml(value)}"`)
    .join(" ");
}

function renderThreadReplyActionAttributes(context) {
  return [
    ["data-reply-id", context.replyId],
    ["data-thread-owner-uid", context.threadOwnerUid],
    ["data-activity-id", context.activityId],
    ["data-actor-uid", context.actorUid],
    ["data-attachment-storage-path", context.attachmentStoragePath],
    ["data-has-attachment", context.hasAttachment ? "true" : "false"],
  ]
    .map(([name, value]) => `${name}="${escapeHtml(value)}"`)
    .join(" ");
}

function renderThreadActionAttributes(context) {
  return [
    ["data-thread-owner-uid", context.threadOwnerUid],
    ["data-activity-id", context.activityId],
  ]
    .map(([name, value]) => `${name}="${escapeHtml(value)}"`)
    .join(" ");
}

function readSocialCommentActionContext(element) {
  if (!element) {
    return null;
  }

  return {
    commentId: String(element.getAttribute("data-comment-id") || ""),
    tripId: String(element.getAttribute("data-trip-id") || ""),
    folderId: String(element.getAttribute("data-folder-id") || ""),
    itemId: String(element.getAttribute("data-item-id") || ""),
    authorUid: String(element.getAttribute("data-author-uid") || ""),
    activityUserId: String(element.getAttribute("data-activity-user-id") || ""),
    attachmentStoragePath: String(element.getAttribute("data-attachment-storage-path") || ""),
    hasAttachment: element.getAttribute("data-has-attachment") === "true",
  };
}

function readActivitySourceContext(element) {
  if (!element) {
    return null;
  }

  return {
    tripId: String(element.getAttribute("data-trip-id") || ""),
    folderId: String(element.getAttribute("data-folder-id") || ""),
    itemId: String(element.getAttribute("data-item-id") || ""),
  };
}

function readWallPostActionContext(element) {
  if (!element) {
    return null;
  }

  return {
    activityId: String(element.getAttribute("data-activity-id") || ""),
    actorUid: String(element.getAttribute("data-actor-uid") || ""),
    targetUserUid: String(element.getAttribute("data-target-user-uid") || ""),
    attachmentStoragePath: String(element.getAttribute("data-attachment-storage-path") || ""),
    hasAttachment: element.getAttribute("data-has-attachment") === "true",
  };
}

function readThreadReplyActionContext(element) {
  if (!element) {
    return null;
  }

  return {
    replyId: String(element.getAttribute("data-reply-id") || ""),
    threadOwnerUid: String(element.getAttribute("data-thread-owner-uid") || ""),
    activityId: String(element.getAttribute("data-activity-id") || ""),
    actorUid: String(element.getAttribute("data-actor-uid") || ""),
    attachmentStoragePath: String(element.getAttribute("data-attachment-storage-path") || ""),
    hasAttachment: element.getAttribute("data-has-attachment") === "true",
  };
}

function readThreadActionContext(element) {
  if (!element) {
    return null;
  }

  return {
    threadOwnerUid: String(element.getAttribute("data-thread-owner-uid") || ""),
    activityId: String(element.getAttribute("data-activity-id") || ""),
  };
}

function readSocialLikeActionContext(element) {
  if (!element) {
    return null;
  }

  return {
    targetKind: String(element.getAttribute("data-target-kind") || ""),
    targetKey: String(element.getAttribute("data-target-key") || ""),
    tripId: String(element.getAttribute("data-trip-id") || ""),
    folderId: String(element.getAttribute("data-folder-id") || ""),
    itemId: String(element.getAttribute("data-item-id") || ""),
    commentId: String(element.getAttribute("data-comment-id") || ""),
    threadOwnerUid: String(element.getAttribute("data-thread-owner-uid") || ""),
    activityId: String(element.getAttribute("data-activity-id") || ""),
    actorUid: String(element.getAttribute("data-actor-uid") || ""),
    replyId: String(element.getAttribute("data-reply-id") || ""),
  };
}

function getSocialCommentAuthorUid(entry) {
  return String(entry?.authorUid || entry?.actorUid || "");
}

function getSocialCommentActivityUserId(entry) {
  return String(entry?.actorUid || entry?.authorUid || "");
}

function getThreadOwnerUid(entry) {
  if (entry?.type === "wall-post") {
    return String(entry?.targetUserUid || "");
  }

  if (entry?.type === "media-comment") {
    return getSocialCommentActivityUserId(entry);
  }

  return "";
}

function getWallPostDocRefs(context) {
  const seenRefs = new Set();

  return [context?.targetUserUid, context?.actorUid]
    .filter(Boolean)
    .reduce((refs, userId) => {
      const refKey = `${userId}:${context.activityId}`;

      if (!context?.activityId || seenRefs.has(refKey)) {
        return refs;
      }

      seenRefs.add(refKey);
      refs.push(getActivityDocRef(userId, context.activityId));
      return refs;
    }, []);
}

function buildThreadKey(threadOwnerUid, activityId) {
  return threadOwnerUid && activityId ? `${threadOwnerUid}:${activityId}` : "";
}

function getLikeCountForTargetKey(targetKey, fallbackCount = 0) {
  if (!targetKey) {
    return Number(fallbackCount || 0);
  }

  const liveActors = likeActorsByTargetKey.get(targetKey);

  if (liveActors) {
    return liveActors.size;
  }

  return Number(fallbackCount || 0);
}

function isTargetLikedByCurrentUser(targetKey) {
  if (!targetKey || !currentUser?.uid) {
    return false;
  }

  const liveActors = likeActorsByTargetKey.get(targetKey);

  if (liveActors) {
    return liveActors.has(currentUser.uid);
  }

  return isTargetKeyInCurrentUserLikedArrays(targetKey);
}

function getLikedArrayFieldForTargetKey(targetKey) {
  return String(targetKey || "").startsWith("media-item:")
    ? "likedMedia"
    : "likedComments";
}

function getCurrentUserLikeProfile() {
  return currentUserProfile || friends.find((friend) => friend.uid === currentUser?.uid) || null;
}

function isTargetKeyInCurrentUserLikedArrays(targetKey) {
  const profile = getCurrentUserLikeProfile();
  const field = getLikedArrayFieldForTargetKey(targetKey);
  return Boolean(profile && Array.isArray(profile[field]) && profile[field].includes(targetKey));
}

function getReplyCountForThreadKey(threadKey) {
  return threadKey ? Number(replyCountsByThreadKey.get(threadKey) || 0) : 0;
}

function getReplyCountForEntry(entry) {
  return getReplyCountForThreadKey(
    buildThreadKey(getThreadOwnerUid(entry), String(entry?.id || ""))
  );
}

function getMediaItemInteractionCounts(item, tripId, folderId) {
  const itemKey = buildMediaItemKeyFromItem(item, tripId, folderId);

  return {
    itemKey,
    likeCount: getLikeCountForTargetKey(itemKey, item?.likeCount),
    commentCount: getCommentCountForMediaItem(item, itemKey),
    replyCount: Number(mediaReplyCountsByItemKey.get(itemKey) || 0),
  };
}

function getCommentCountForMediaItem(item, itemKey) {
  return Math.max(
    Number(item?.commentCount || 0),
    getObservedMediaCommentCountForItemKey(itemKey)
  );
}

function getObservedMediaCommentCountForItemKey(itemKey) {
  if (!itemKey) {
    return 0;
  }

  return Math.max(
    Number(mediaCommentCountsByItemKey.get(itemKey) || 0),
    getActivityMediaCommentCountForItemKey(itemKey)
  );
}

function getActivityMediaCommentCountForItemKey(itemKey) {
  if (!itemKey) {
    return 0;
  }

  const commentKeys = new Set();

  feedRootActivities.forEach((entry) => {
    if (entry?.type !== "media-comment") {
      return;
    }

    const entryItemKey = buildMediaItemKey(entry.tripId, entry.folderId, entry.itemId);

    if (entryItemKey !== itemKey) {
      return;
    }

    const commentKey = buildMediaCommentLikeKey(
      entry.tripId,
      entry.folderId,
      entry.itemId,
      entry.id
    );

    if (commentKey) {
      commentKeys.add(commentKey);
    }
  });

  return commentKeys.size;
}

function getVideoPreviewThreadContext(previewState = getCurrentVideoPreviewState()) {
  const activityId = String(previewState?.threadCommentId || "");
  const threadOwnerUid = String(previewState?.threadOwnerUid || "");

  if (!activityId || !threadOwnerUid) {
    return null;
  }

  return {
    threadOwnerUid,
    activityId,
  };
}

function getCurrentThreadReplies() {
  return currentThreadRepliesKey
    ? threadRepliesByKey.get(currentThreadRepliesKey) || []
    : [];
}

function canModerateSocialEntryAsAdmin() {
  return Boolean(currentUser?.uid && isAdminViewEnabled());
}

function canEditSocialCommentContext(context) {
  return Boolean(
    context?.commentId &&
      context.tripId &&
      context.folderId &&
      context.itemId &&
      currentUser?.uid &&
      (context.authorUid === currentUser.uid || canModerateSocialEntryAsAdmin())
  );
}

function canEditWallPostContext(context) {
  return Boolean(
    context?.activityId &&
      currentUser?.uid &&
      (context.actorUid === currentUser.uid || canModerateSocialEntryAsAdmin())
  );
}

function canDeleteSocialCommentContext(context) {
  return Boolean(
    context?.commentId &&
      context.tripId &&
      context.folderId &&
      context.itemId &&
      currentUser?.uid &&
      (context.authorUid === currentUser.uid || canModerateSocialEntryAsAdmin())
  );
}

function canDeleteWallPostContext(context) {
  return Boolean(
    context?.activityId &&
      currentUser?.uid &&
      (
        context.actorUid === currentUser.uid ||
        context.targetUserUid === currentUser.uid ||
        canModerateSocialEntryAsAdmin()
      )
  );
}

function canEditThreadReplyContext(context) {
  return Boolean(
    context?.replyId &&
      context.threadOwnerUid &&
      context.activityId &&
      currentUser?.uid &&
      (context.actorUid === currentUser.uid || canModerateSocialEntryAsAdmin())
  );
}

function canDeleteThreadReplyContext(context) {
  return Boolean(
    context?.replyId &&
      context.threadOwnerUid &&
      context.activityId &&
      currentUser?.uid &&
      (context.actorUid === currentUser.uid || canModerateSocialEntryAsAdmin())
  );
}

function isEditingSocialComment(entry) {
  return Boolean(entry?.id && currentSocialCommentEditId === entry.id);
}

function isEditingWallPost(entry) {
  return Boolean(entry?.id && currentWallPostEditId === entry.id);
}

function isEditingThreadReply(entry) {
  return Boolean(entry?.id && currentThreadReplyEditId === entry.id);
}

function resetSocialCommentEdit() {
  currentSocialCommentEditId = "";
}

function resetWallPostEdit() {
  currentWallPostEditId = "";
}

function resetThreadReplyEdit() {
  currentThreadReplyEditId = "";
}

function isCurrentThreadContext(context) {
  return Boolean(
    context?.threadOwnerUid &&
      context?.activityId &&
      currentThreadContext?.threadOwnerUid === context.threadOwnerUid &&
      currentThreadContext?.activityId === context.activityId
  );
}

function clearActiveThreadState() {
  currentThreadSurface = "";
  currentThreadContext = null;
  currentThreadRootEntry = null;
  currentThreadStatusMessage = "";
  resetThreadReplyEdit();
  threadRepliesUnsubscribe?.();
  threadRepliesUnsubscribe = null;
  currentThreadRepliesKey = "";
  threadForm?.reset();
  videoPreviewThreadForm?.reset();
  setThreadStatusMessage("");
}

function syncActiveVideoPreviewThread(
  previewState = getCurrentVideoPreviewState(),
  comments = null
) {
  const threadContext = getVideoPreviewThreadContext(previewState);

  if (!threadContext) {
    if (currentThreadSurface === "preview") {
      clearActiveThreadState();
    }
    return;
  }

  const selectedComment = (comments || []).find((comment) => comment.id === threadContext.activityId) || null;
  const isSameThread = currentThreadSurface === "preview" && isCurrentThreadContext(threadContext);

  currentThreadSurface = "preview";
  currentThreadContext = threadContext;

  if (!isSameThread) {
    currentThreadRootEntry = null;
    setThreadStatusMessage("LOADING THREAD.");
  }

  if (selectedComment) {
    currentThreadRootEntry = normalizeThreadRootEntry(selectedComment);
  } else {
    currentThreadRootEntry = null;
  }

  syncThreadRepliesSubscription(threadContext);
}

function renderVideoPreviewThreadPanel(previewState = getCurrentVideoPreviewState()) {
  const threadContextValue = getVideoPreviewThreadContext(previewState);
  const rootEntry = currentThreadSurface === "preview" && threadContextValue
    ? currentThreadRootEntry
    : null;
  const replies = currentThreadSurface === "preview" ? getCurrentThreadReplies() : [];
  const canReply = Boolean(rootEntry && db && currentUser?.uid && canUploadMedia());
  const hasActiveThread = Boolean(threadContextValue && currentThreadSurface === "preview");

  if (videoPreviewThreadShell) {
    videoPreviewThreadShell.classList.toggle("hidden", !hasActiveThread);
  }

  if (!hasActiveThread) {
    if (videoPreviewThreadTitle) {
      videoPreviewThreadTitle.textContent = "";
    }

    if (videoPreviewThreadContext) {
      videoPreviewThreadContext.textContent = "";
    }

    if (videoPreviewThreadRoot) {
      videoPreviewThreadRoot.innerHTML = "";
    }

    if (videoPreviewThreadList) {
      videoPreviewThreadList.innerHTML = "";
    }

    if (videoPreviewThreadStatus) {
      videoPreviewThreadStatus.textContent = "";
    }

    if (videoPreviewThreadForm) {
      videoPreviewThreadForm.classList.add("hidden");
      videoPreviewThreadForm.reset();
    }

    return;
  }

  if (videoPreviewThreadTitle) {
    videoPreviewThreadTitle.textContent = "";
  }

  if (videoPreviewThreadContext) {
    videoPreviewThreadContext.textContent = rootEntry
      ? buildPreviewThreadContextLabel(rootEntry)
      : "OPENING SELECTED THREAD.";
  }

  if (videoPreviewThreadRoot) {
    videoPreviewThreadRoot.innerHTML = rootEntry
      ? renderThreadRootEntry(rootEntry, { showActionLabel: false })
      : renderEmptySocialState(currentThreadStatusMessage || "LOADING THREAD.");
  }

  if (videoPreviewThreadList) {
    videoPreviewThreadList.innerHTML = rootEntry
      ? replies.length > 0
        ? replies.map(renderThreadReply).join("")
        : ""
      : renderEmptySocialState(currentThreadStatusMessage || "LOADING THREAD.");
  }

  if (videoPreviewThreadForm) {
    videoPreviewThreadForm.classList.toggle("hidden", !canReply);
  }

  if (videoPreviewThreadSubmit) {
    videoPreviewThreadSubmit.disabled = false;
  }

  if (!rootEntry) {
    return;
  }

  if (replies.length > 0) {
    setThreadStatusMessage(buildCountLabel(replies.length, "REPLY"));
    return;
  }

  setThreadStatusMessage(canReply ? "" : "SIGN IN TO REPLY.");
}

function resetVideoPreviewThreadSelection() {
  if (currentVideoPreviewContext) {
    currentVideoPreviewContext.threadCommentId = "";
    currentVideoPreviewContext.threadOwnerUid = "";
  }

  if (currentThreadSurface === "preview") {
    clearActiveThreadState();
  }

  renderVideoPreviewComments(getCurrentVideoPreviewState());
}

function resetActiveThreadForContext(context) {
  if (!isCurrentThreadContext(context)) {
    return;
  }

  if (currentThreadSurface === "preview") {
    resetVideoPreviewThreadSelection();
    return;
  }

  resetThreadDialog();
}

function renderVisibleSocialSurfaces() {
  if (videoPreviewModalOpen) {
    renderVideoPreviewComments(getCurrentVideoPreviewState());
  }

  if (threadModalOpen) {
    renderThreadDialog();
  }

  if (!isProfileRoute()) {
    return;
  }

  const profileView = getActiveProfileView();
  const friend = profileView?.state === "ready" ? profileView.friend : null;
  renderProfileActivityPanel(
    friend,
    Boolean(friend),
    Boolean(friend?.uid && friend.uid === currentUser?.uid),
    profileView
  );
}

function renderVisibleRouteContent() {
  if (!canUploadMedia() && !isLegalRoute()) {
    syncProfileActivitySubscription("");
    if (tripList) {
      tripList.innerHTML = "";
    }
    if (profileTripList) {
      profileTripList.innerHTML = "";
    }
    if (membersPageList) {
      membersPageList.innerHTML = "";
    }
    if (feedAllList) {
      feedAllList.innerHTML = "";
    }
    return;
  }

  if (isProfileRoute()) {
    renderProfilePage();
    return;
  }

  if (isMembersRoute()) {
    syncProfileActivitySubscription("");
    renderMembersPage();
    return;
  }

  if (isFeedRoute()) {
    syncProfileActivitySubscription("");
    renderFeedPage();
    return;
  }

  if (isLegalRoute()) {
    syncProfileActivitySubscription("");
    return;
  }

  syncProfileActivitySubscription("");
  renderTrips();
}

function scheduleInteractionRefresh() {
  if (interactionRefreshFrame) {
    return;
  }

  interactionRefreshFrame = window.requestAnimationFrame(() => {
    interactionRefreshFrame = 0;
    renderVisibleRouteContent();
    syncCommentNotificationControls();

    if (videoPreviewModalOpen) {
      renderVideoPreviewComments(getCurrentVideoPreviewState());
    }

    if (threadModalOpen) {
      renderThreadDialog();
    }
  });
}

function getMediaCommentDocRef(context) {
  return doc(
    db,
    runtimeConfig.collections.trips,
    context.tripId,
    "folders",
    context.folderId,
    "items",
    context.itemId,
    "comments",
    context.commentId
  );
}

function getMediaItemDocRef(context) {
  return doc(
    db,
    runtimeConfig.collections.trips,
    context.tripId,
    "folders",
    context.folderId,
    "items",
    context.itemId
  );
}

function getMediaItemLikeDocRef(context, userUid) {
  return doc(
    db,
    runtimeConfig.collections.trips,
    context.tripId,
    "folders",
    context.folderId,
    "items",
    context.itemId,
    "likes",
    userUid
  );
}

function getActivityDocRef(userId, activityId) {
  return doc(db, runtimeConfig.collections.users, userId, "activity", activityId);
}

function getThreadReplyDocRef(context) {
  if (!db || !context?.threadOwnerUid || !context?.activityId || !context?.replyId) {
    return null;
  }

  return doc(
    db,
    runtimeConfig.collections.users,
    context.threadOwnerUid,
    "activity",
    context.activityId,
    "replies",
    context.replyId
  );
}

function getSocialLikeDocRef(context, userUid) {
  if (!db || !context?.targetKind || !userUid) {
    return null;
  }

  if (context.targetKind === "media-comment") {
    return doc(
      db,
      runtimeConfig.collections.trips,
      context.tripId,
      "folders",
      context.folderId,
      "items",
      context.itemId,
      "comments",
      context.commentId,
      "likes",
      userUid
    );
  }

  if (context.targetKind === "wall-post") {
    return doc(
      db,
      runtimeConfig.collections.users,
      context.threadOwnerUid,
      "activity",
      context.activityId,
      "likes",
      userUid
    );
  }

  if (context.targetKind === "thread-reply") {
    return doc(
      db,
      runtimeConfig.collections.users,
      context.threadOwnerUid,
      "activity",
      context.activityId,
      "replies",
      context.replyId,
      "likes",
      userUid
    );
  }

  return null;
}

function getLikeDocRefForContext(context, userUid) {
  if (!context?.targetKind || !userUid) {
    return null;
  }

  if (context.targetKind === "media-item") {
    return getMediaItemLikeDocRef(context, userUid);
  }

  return getSocialLikeDocRef(context, userUid);
}

function getLikeTargetDocRef(context) {
  if (!db || !context?.targetKind) {
    return null;
  }

  if (context.targetKind === "media-item") {
    return doc(
      db,
      runtimeConfig.collections.trips,
      context.tripId,
      "folders",
      context.folderId,
      "items",
      context.itemId
    );
  }

  if (context.targetKind === "media-comment") {
    return getMediaCommentDocRef(context);
  }

  if (context.targetKind === "wall-post") {
    return getActivityDocRef(context.threadOwnerUid, context.activityId);
  }

  if (context.targetKind === "thread-reply") {
    return doc(
      db,
      runtimeConfig.collections.users,
      context.threadOwnerUid,
      "activity",
      context.activityId,
      "replies",
      context.replyId
    );
  }

  return null;
}

function getLikeMirrorTargetDocRefs(context, primaryRef) {
  const refs = [];
  const seenPaths = new Set(primaryRef?.path ? [primaryRef.path] : []);
  const addRef = (ref) => {
    if (!ref?.path || seenPaths.has(ref.path)) {
      return;
    }

    seenPaths.add(ref.path);
    refs.push(ref);
  };

  if (context?.targetKind === "media-comment" && context.threadOwnerUid && context.activityId) {
    addRef(getActivityDocRef(context.threadOwnerUid, context.activityId));
  }

  if (
    context?.targetKind === "wall-post" &&
    context.actorUid &&
    context.activityId &&
    context.actorUid !== context.threadOwnerUid
  ) {
    addRef(getActivityDocRef(context.actorUid, context.activityId));
  }

  return refs;
}

function getLikedArrayFieldForContext(context) {
  return context?.targetKind === "media-item" ? "likedMedia" : "likedComments";
}

function getLikedArrayValueForContext(context) {
  return String(context?.targetKey || "");
}

// Public like entry point used by media, comments, wall posts, and replies. The
// optional `desiredLiked` value prevents stale `likedMedia`/`likedComments`
// arrays from flipping the wrong way when a user refreshes on old state.
async function toggleLikeForContext(context, userUid, desiredLiked = null) {
  try {
    return await writeLikeStateTransaction(context, userUid, true, desiredLiked);
  } catch (error) {
    if (!isFirestorePermissionError(error)) {
      throw error;
    }

    return writeLikeStateTransaction(context, userUid, false, desiredLiked);
  }
}

// Transactionally updates the like doc, the target counter, mirrored activity
// docs, and the current user's liked arrays. If the UI asks to unlike a stale
// array entry without a like doc, this removes the stale array value without
// decrementing counters that were never incremented.
async function writeLikeStateTransaction(context, userUid, includeCreatedAtMs = true, desiredLiked = null) {
  const likeRef = getLikeDocRefForContext(context, userUid);
  const targetRef = getLikeTargetDocRef(context);
  const userRef = userUid ? doc(db, runtimeConfig.collections.users, userUid) : null;
  const likedArrayField = getLikedArrayFieldForContext(context);
  const likedArrayValue = getLikedArrayValueForContext(context);

  if (!likeRef || !targetRef || !userRef || !likedArrayField || !likedArrayValue) {
    throw new Error("Like target is missing.");
  }

  return runTransaction(db, async (transaction) => {
    const likeSnapshot = await transaction.get(likeRef);
    const targetSnapshot = await transaction.get(targetRef);
    const mirrorTargetSnapshots = [];
    const mirrorTargetRefs = getLikeMirrorTargetDocRefs(context, targetRef);
    const hasLikeDoc = likeSnapshot.exists();
    const nextLiked = typeof desiredLiked === "boolean" ? desiredLiked : !hasLikeDoc;
    const currentLikeCount = Math.max(Number(targetSnapshot.data()?.likeCount || 0), 0);
    const likePayload = includeCreatedAtMs
      ? {
          createdAt: serverTimestamp(),
          createdAtMs: Date.now(),
        }
      : {
          createdAt: serverTimestamp(),
        };

    for (const mirrorRef of mirrorTargetRefs) {
      mirrorTargetSnapshots.push({
        ref: mirrorRef,
        snapshot: await transaction.get(mirrorRef),
      });
    }

    if (nextLiked && !hasLikeDoc) {
      transaction.set(likeRef, likePayload);
      transaction.update(targetRef, { likeCount: currentLikeCount + 1 });
      mirrorTargetSnapshots.forEach(({ ref, snapshot }) => {
        if (snapshot.exists()) {
          const mirrorLikeCount = Math.max(Number(snapshot.data()?.likeCount || 0), 0);
          transaction.update(ref, { likeCount: mirrorLikeCount + 1 });
        }
      });
      transaction.update(userRef, { [likedArrayField]: arrayUnion(likedArrayValue) });
      return true;
    }

    if (nextLiked && hasLikeDoc) {
      transaction.update(userRef, { [likedArrayField]: arrayUnion(likedArrayValue) });
      return true;
    }

    if (!nextLiked && hasLikeDoc) {
      transaction.delete(likeRef);
      transaction.update(targetRef, { likeCount: Math.max(currentLikeCount - 1, 0) });
      mirrorTargetSnapshots.forEach(({ ref, snapshot }) => {
        if (snapshot.exists()) {
          const mirrorLikeCount = Math.max(Number(snapshot.data()?.likeCount || 0), 0);
          transaction.update(ref, { likeCount: Math.max(mirrorLikeCount - 1, 0) });
        }
      });
      transaction.update(userRef, { [likedArrayField]: arrayRemove(likedArrayValue) });
      return false;
    }

    transaction.update(userRef, { [likedArrayField]: arrayRemove(likedArrayValue) });
    return false;
  });
}

function applyLocalLikeState(targetKey, userUid, liked) {
  if (!targetKey || !userUid) {
    return;
  }

  const nextActors = new Set(likeActorsByTargetKey.get(targetKey) || []);

  if (liked) {
    nextActors.add(userUid);
  } else {
    nextActors.delete(userUid);
  }

  const nextLikeActorsByTargetKey = new Map(likeActorsByTargetKey);

  if (nextActors.size > 0) {
    nextLikeActorsByTargetKey.set(targetKey, nextActors);
  } else {
    nextLikeActorsByTargetKey.delete(targetKey);
  }

  likeActorsByTargetKey = nextLikeActorsByTargetKey;
  applyLocalLikedArrayState(targetKey, userUid, liked);
}

function applyLocalLikedArrayState(targetKey, userUid, liked) {
  if (!targetKey || !userUid || userUid !== currentUser?.uid) {
    return;
  }

  const field = getLikedArrayFieldForTargetKey(targetKey);
  const updateProfile = (profile) => {
    if (!profile) {
      return profile;
    }

    const currentValues = new Set(Array.isArray(profile[field]) ? profile[field] : []);

    if (liked) {
      currentValues.add(targetKey);
    } else {
      currentValues.delete(targetKey);
    }

    return {
      ...profile,
      [field]: [...currentValues],
    };
  };

  currentUserProfile = updateProfile(currentUserProfile);
  friends = friends.map((friend) => (friend.uid === userUid ? updateProfile(friend) : friend));
}

function syncThreadRepliesSubscription(context = currentThreadContext) {
  const nextKey = buildThreadKey(context?.threadOwnerUid, context?.activityId);

  if (!nextKey || !db || !runtimeConfig?.collections?.users) {
    threadRepliesUnsubscribe?.();
    threadRepliesUnsubscribe = null;
    currentThreadRepliesKey = "";
    return;
  }

  if (currentThreadRepliesKey === nextKey) {
    return;
  }

  threadRepliesUnsubscribe?.();
  currentThreadRepliesKey = nextKey;

  if (!threadRepliesByKey.has(nextKey)) {
    threadRepliesByKey.set(nextKey, []);
  }

  const repliesQuery = query(
    collection(
      db,
      runtimeConfig.collections.users,
      context.threadOwnerUid,
      "activity",
      context.activityId,
      "replies"
    ),
    orderBy("createdAtMs", "asc")
  );

  threadRepliesUnsubscribe = onSnapshot(
    repliesQuery,
    (snapshot) => {
      threadRepliesByKey.set(
        nextKey,
        snapshot.docs.map((replyDoc) =>
          normalizeThreadReply({
            id: replyDoc.id,
            threadOwnerUid: context.threadOwnerUid,
            activityId: context.activityId,
            ...replyDoc.data(),
          })
        )
      );
      setReplyCountForThreadKey(nextKey, snapshot.size);
      rebuildMediaReplyCountsByItemKey();

      if (currentThreadRepliesKey === nextKey) {
        if (currentThreadSurface === "modal") {
          renderThreadDialog();
        }

        if (currentThreadSurface === "preview") {
          renderVideoPreviewComments(getCurrentVideoPreviewState());
        }
      }
    },
    (error) => {
      setThreadStatusMessage(getFriendlyFirestoreMessage(error).toUpperCase());

      if (currentThreadSurface === "modal") {
        renderThreadDialog();
      }

      if (currentThreadSurface === "preview") {
        renderVideoPreviewThreadPanel(getCurrentVideoPreviewState());
      }
    }
  );
}

function renderThreadDialog() {
  const rootEntry = currentThreadRootEntry;
  const replies = getCurrentThreadReplies();
  const canReply = Boolean(rootEntry && db && currentUser?.uid && canUploadMedia());

  if (threadTitle) {
    threadTitle.textContent = buildThreadTitle(rootEntry);
  }

  if (threadContext) {
    threadContext.textContent = buildThreadContextLabel(rootEntry);
  }

  if (threadRootEntry) {
    threadRootEntry.innerHTML = rootEntry
      ? renderThreadRootEntry(rootEntry)
      : renderEmptySocialState(currentThreadStatusMessage || "LOADING THREAD.");
  }

  if (threadList) {
    threadList.innerHTML = rootEntry
      ? replies.length > 0
        ? replies.map(renderThreadReply).join("")
        : ""
      : "";
  }

  if (threadForm) {
    threadForm.classList.toggle("hidden", !canReply);
  }

  if (threadSubmit) {
    threadSubmit.disabled = false;
  }

  if (!rootEntry) {
    return;
  }

  if (replies.length > 0) {
    setThreadStatusMessage(buildCountLabel(replies.length, "REPLY"));
    return;
  }

  setThreadStatusMessage(canReply ? "" : "SIGN IN TO REPLY.");
}

function resetThreadDialog() {
  if (currentThreadSurface === "modal") {
    clearActiveThreadState();
  }

  threadForm?.reset();

  if (threadTitle) {
    threadTitle.textContent = "Comment Thread";
  }

  if (threadContext) {
    threadContext.textContent = "";
  }

  if (threadRootEntry) {
    threadRootEntry.innerHTML = "";
  }

  if (threadList) {
    threadList.innerHTML = "";
  }

  setThreadModalOpen(false);
}

function setSocialSurfaceStatus(message) {
  if (videoPreviewModalOpen) {
    setVideoPreviewCommentStatus(message);
  }

  if (isFeedRoute()) {
    setFeedStatus(message);
  }

  if (isProfileRoute()) {
    setProfileActivityStatus(message);
  }
}

function getSocialActionButtonClass(tone = "default") {
  if (tone === "delete") {
    return "inline-flex border border-white/10 px-1.5 py-0.5 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.54rem] uppercase tracking-[0.16em] text-stone-200 transition hover:border-red-300/35 hover:bg-red-300/10 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-45";
  }

  return "inline-flex border border-white/10 px-1.5 py-0.5 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.54rem] uppercase tracking-[0.16em] text-stone-200 transition hover:border-white/30 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-45";
}

function getSocialMenuItemButtonClass(tone = "default") {
  if (tone === "delete") {
    return "block w-full border border-transparent px-2 py-1.5 text-left font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.56rem] uppercase tracking-[0.16em] text-stone-200 transition hover:border-red-300/35 hover:bg-red-300/10 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-45";
  }

  return "block w-full border border-transparent px-2 py-1.5 text-left font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.56rem] uppercase tracking-[0.16em] text-stone-200 transition hover:border-white/18 hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-45";
}

function getSocialLikeButtonClass(liked = false) {
  return liked
    ? "inline-flex border border-sky-200/45 bg-sky-100/[0.08] px-2 py-0.75 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.58rem] uppercase tracking-[0.14em] text-sky-50 transition hover:border-sky-100/65 hover:bg-sky-100/[0.14] disabled:cursor-not-allowed disabled:opacity-45"
    : "inline-flex border border-white/10 px-2 py-0.75 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.58rem] uppercase tracking-[0.14em] text-stone-200 transition hover:border-white/30 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-45";
}

function renderSocialMetricBadge(count, singularLabel, tone = "default") {
  const badgeToneClass = tone === "highlight"
    ? "border-amber-200/28 bg-amber-100/[0.05] text-amber-50/92"
    : "border-white/10 bg-black/24 text-stone-300/72";

  return `
    <span class="inline-flex border px-1.5 py-0.5 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.54rem] uppercase tracking-[0.16em] ${badgeToneClass}">
      ${escapeHtml(buildCountLabel(count, singularLabel))}
    </span>
  `;
}

function buildActivityActorFields() {
  const profile =
    currentUserProfile ||
    getFriendByUid(currentUser?.uid) ||
    normalizeFriend({
      uid: currentUser?.uid || "",
      email: currentUser?.email || "",
      displayName: "",
      googleName: currentUser?.displayName || inferNameFromEmail(currentUser?.email),
      routeId: currentUserProfile?.routeId || "",
    });

  return {
    actorUid: String(currentUser?.uid || profile.uid || ""),
    actorLabel: getFriendLabel(profile),
    actorRouteId: normalizeRouteId(profile.routeId),
    actorPhotoURL: getFriendPhotoUrl(profile),
  };
}

async function uploadSocialAttachment(file, contextLabel) {
  if (!file) {
    return {
      attachmentURL: "",
      attachmentStoragePath: "",
      attachmentMimeType: "",
      attachmentName: "",
    };
  }

  if (!storage || !storageReady || !currentUser?.uid) {
    throw new Error(STRINGS.uploads.storageNotReady);
  }

  if (!isSupportedProfileImage(file)) {
    throw new Error(STRINGS.firebase.profileImageType);
  }

  if (Number(file.size || 0) > MAX_PROFILE_IMAGE_SIZE_BYTES) {
    throw new Error(STRINGS.firebase.profileImageSize);
  }

  const extension = getFileExtension(file.name) || getSocialImageExtension(file.type);
  const safeContext = sanitizeFileBaseName(contextLabel || "activity");
  const storagePath = `social/${currentUser.uid}/${safeContext}-${buildUniqueStamp()}.${extension}`;
  const attachmentRef = storageRef(storage, storagePath);
  const task = uploadBytesResumable(attachmentRef, file, {
    contentType: file.type || "image/jpeg",
    customMetadata: {
      createdByUid: String(currentUser.uid || ""),
      createdByEmail: String(currentUser.email || ""),
      context: safeContext,
    },
  });

  await new Promise((resolve, reject) => {
    task.on("state_changed", undefined, reject, resolve);
  });

  return {
    attachmentURL: await getDownloadURL(task.snapshot.ref),
    attachmentStoragePath: storagePath,
    attachmentMimeType: file.type || "image/jpeg",
    attachmentName: file.name || "attachment",
  };
}

function getSocialImageExtension(mimeType) {
  const normalized = String(mimeType || "").toLowerCase();

  if (normalized === "image/png") {
    return "png";
  }

  if (normalized === "image/webp") {
    return "webp";
  }

  if (normalized === "image/gif") {
    return "gif";
  }

  return "jpg";
}

function renderSocialActorLink(label, routeId, className) {
  const displayLabel = normalizeSocialLabel(label);
  const profileHref = routeId ? buildProfilePath(routeId) : "";

  if (!profileHref) {
    return `<span class="${className}">${escapeHtml(displayLabel)}</span>`;
  }

  return `<a href="${escapeHtml(profileHref)}" class="${className}">${escapeHtml(displayLabel)}</a>`;
}

function renderSocialEntryBody(body) {
  const normalizedBody = normalizeSocialBody(body);

  if (!normalizedBody) {
    return "";
  }

  return `<p class="mt-3 whitespace-pre-wrap break-words font-['Arial_Narrow','Helvetica_Neue',Arial,sans-serif] text-[0.96rem] font-semibold leading-5 tracking-[0.03em] text-stone-100/88">${escapeHtml(normalizedBody)}</p>`;
}

function renderSocialAttachment(entry) {
  if (!entry?.attachmentURL) {
    return "";
  }

  const name = entry.attachmentName || "attachment";

  return `
    <a href="${escapeHtml(entry.attachmentURL)}" target="_blank" rel="noreferrer" class="mt-3 block overflow-hidden border border-white/10 bg-black/32 transition hover:border-white/28">
      <img src="${escapeHtml(entry.attachmentURL)}" alt="${escapeHtml(name)}" class="max-h-72 w-full object-contain">
    </a>
  `;
}

function renderEmptySocialState(message) {
  if (!message) {
    return "";
  }

  return `
    <div class="border border-white/10 bg-black/18 px-3 py-3 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.62rem] uppercase tracking-[0.16em] text-stone-300/54">
      ${escapeHtml(message)}
    </div>
  `;
}

function normalizeSocialBody(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, MAX_SOCIAL_BODY_LENGTH);
}

function normalizeSocialLabel(value) {
  return normalizeDisplayName(value) || STRINGS.members.unknown;
}

function getSocialPhotoUrl(photoURL) {
  const url = String(photoURL || "").trim();
  return url || DEFAULT_PROFILE_IMAGE_URL;
}

function formatActivityTime(value) {
  const timestamp = Number(value || 0);

  if (!timestamp) {
    return "JUST NOW";
  }

  return new Date(timestamp)
    .toLocaleString([], {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
    .toUpperCase();
}

function buildCountLabel(count, singularLabel) {
  const total = Number(count || 0);
  const label = total === 1 ? singularLabel : `${singularLabel}S`;
  return `${total} ${label}`;
}

function setVideoPreviewCommentStatus(message) {
  if (videoPreviewCommentStatus) {
    videoPreviewCommentStatus.textContent = message || "";
  }
}

function setThreadStatusMessage(message) {
  currentThreadStatusMessage = message || "";

  if (threadStatus) {
    threadStatus.textContent = currentThreadStatusMessage;
  }

  if (videoPreviewThreadStatus) {
    videoPreviewThreadStatus.textContent = currentThreadStatusMessage;
  }
}

function setProfileActivityStatus(message) {
  if (profileActivityStatus) {
    profileActivityStatus.textContent = message || "";
  }
}

function syncVideoPreviewCertification(previewState = getCurrentVideoPreviewState()) {
  const certified = Boolean(previewState?.currentItem && isItemCertified(previewState.currentItem));
  const canCertify = Boolean(
    previewState?.currentItem?.kind === "file" &&
      isAdminViewEnabled()
  );

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

  if (videoPreviewCertifyButton) {
    const certifyButtonClass = "min-h-9 min-w-0 flex-1 shrink px-2 py-1.5 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.58rem] uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-0 sm:flex-none sm:px-3 sm:py-2 sm:text-[0.66rem] sm:tracking-[0.18em]";
    const certifyGoldClass = `${certifyButtonClass} border border-amber-200/35 bg-amber-100/[0.07] text-amber-50 hover:border-amber-100/55 hover:bg-amber-100/[0.12]`;
    const uncertifyIceClass = `${certifyButtonClass} border border-sky-300/32 bg-sky-100/[0.03] text-sky-100 hover:border-sky-200/55 hover:bg-sky-100/[0.08]`;
    videoPreviewCertifyButton.disabled = false;
    videoPreviewCertifyButton.textContent = certified ? "Uncertify" : "Certify";
    videoPreviewCertifyButton.setAttribute(
      "aria-label",
      certified ? "Remove Certification" : "Certify Media"
    );
    videoPreviewCertifyButton.className = certified ? uncertifyIceClass : certifyGoldClass;
    videoPreviewCertifyButton.classList.toggle("hidden", !canCertify);

    if (certified) {
      videoPreviewCertifyButton.removeAttribute("style");
    } else {
      videoPreviewCertifyButton.setAttribute("style", `${getHighlightButtonStyle(true)}color:#fff8cb;`);
    }
  }
}

// -----------------------------------------------------------------------------
// Archive And Profile Action Handlers
// -----------------------------------------------------------------------------
// Ownership checks plus delegated click/change handlers for roles, previews,
// certification, moving/deleting trips or items, and profile admin actions.
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

  const mediaPreviewTrigger = event.target.closest("[data-action='preview-media']");

  if (mediaPreviewTrigger) {
    handleVideoPreviewClick(mediaPreviewTrigger);
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

  const removeTripCoverTrigger = event.target.closest("[data-action='remove-trip-cover']");

  if (removeTripCoverTrigger) {
    void handleTripCoverRemoveClick(removeTripCoverTrigger);
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

  const featuredTrigger = event.target.closest("[data-action='toggle-featured-clip']");

  if (featuredTrigger) {
    void handleFeaturedClipToggleClick(featuredTrigger);
    return;
  }

  const editTrigger = event.target.closest("[data-action='edit-item']");

  if (editTrigger) {
    handleItemEditClick(editTrigger);
    return;
  }

  const mediaCardPreviewTrigger = event.target.closest("[data-action='preview-media-card']");

  if (
    mediaCardPreviewTrigger &&
    !event.target.closest("a[href], button, input, textarea, select, label, summary, details, form")
  ) {
    handleVideoPreviewClick(mediaCardPreviewTrigger);
    return;
  }

  if (event.target.closest("[data-ignore-trip-toggle='true']")) {
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

function handleVideoPreviewAdminActionClick(event) {
  const trigger = event.target.closest("[data-action='edit-item'], [data-action='move-item'], [data-action='delete-item']");

  if (!trigger || !videoPreviewAdminActions?.contains(trigger)) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const action = String(trigger.getAttribute("data-action") || "");

  if (action === "edit-item") {
    const restoreContext = buildVideoPreviewRestoreContext(action);

    if (!restoreContext) {
      return;
    }

    setPendingVideoPreviewRestore(restoreContext);
    resetVideoPreview();

    if (!handleItemEditClick(trigger)) {
      clearPendingVideoPreviewRestore(action);
    }

    return;
  }

  if (action === "move-item") {
    const restoreContext = buildVideoPreviewRestoreContext(action);

    if (!restoreContext) {
      return;
    }

    setPendingVideoPreviewRestore(restoreContext);
    resetVideoPreview();

    if (!handleItemMoveClick(trigger)) {
      clearPendingVideoPreviewRestore(action);
    }

    return;
  }

  if (action === "delete-item") {
    void handleItemDeleteClick(trigger);
  }
}

function handleTripBrowserChange(event) {
  const tripCoverInput = event.target.closest("[data-action='trip-cover-upload']");

  if (tripCoverInput) {
    void handleTripCoverUploadInputChange(tripCoverInput);
    return;
  }

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

  if (!tripId || !folderId || !itemId || !item || !canEditItem(item)) {
    return false;
  }

  beginItemEdit(tripId, folderId, item);
  return true;
}

function handleItemMoveClick(trigger) {
  const tripId = String(trigger.getAttribute("data-trip-id") || "");
  const folderId = String(trigger.getAttribute("data-folder-id") || "");
  const itemId = String(trigger.getAttribute("data-item-id") || "");
  const item = getItemsForFolder(tripId, folderId).find((entry) => entry.id === itemId);

  if (!tripId || !folderId || !itemId || !item || !canMoveItem(item, tripId, folderId)) {
    return false;
  }

  beginItemMove(tripId, folderId, item);
  return true;
}

async function handleItemCertifiedToggleClick(trigger) {
  if (!db || !isAdminViewEnabled()) {
    return;
  }

  const tripId = String(trigger.getAttribute("data-trip-id") || "");
  const folderId = String(trigger.getAttribute("data-folder-id") || "");
  const itemId = String(trigger.getAttribute("data-item-id") || "");
  const item = getItemsForFolder(tripId, folderId).find((entry) => entry.id === itemId);
  const sourceFolderId = resolveItemSourceFolderId(item, folderId);

  if (!tripId || !folderId || !itemId || !item || item.kind !== "file") {
    return;
  }

  await toggleItemCertification(tripId, sourceFolderId, itemId, trigger, item);
}

async function handleVideoPreviewCertifiedToggleClick(event) {
  if (!db || !isAdminViewEnabled()) {
    return;
  }

  const previewState = getCurrentVideoPreviewState();
  const item = previewState?.currentItem || null;
  const sourceFolderId = resolveItemSourceFolderId(item, previewState?.folderId || "");

  if (!previewState || !item || item.kind !== "file" || !sourceFolderId) {
    return;
  }

  await toggleItemCertification(
    previewState.tripId,
    sourceFolderId,
    previewState.itemId,
    event.currentTarget,
    item
  );
}

async function toggleItemCertification(tripId, folderId, itemId, trigger, fallbackItem = null) {
  if (!db || !isAdminViewEnabled()) {
    return;
  }

  const item =
    getItemsForFolder(tripId, folderId).find((entry) => entry.id === itemId) ||
    fallbackItem;

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

  if (trigger) {
    trigger.disabled = true;
  }

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
          label: HIGHLIGHT_FOLDER_DISPLAY_LABEL,
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

    if (
      currentVideoPreviewContext?.tripId === tripId &&
      currentVideoPreviewContext.itemId === itemId
    ) {
      currentVideoPreviewContext.folderId = folderId;
    }

    renderAll();
    syncVideoPreviewNavigation();
    syncVideoPreviewMedia();

    authDetail.textContent = nextCertified
      ? `${getItemDisplayName(item).toUpperCase()} CERTIFIED / ADDED TO ${HIGHLIGHT_FOLDER_LABEL}`
      : `${getItemDisplayName(item).toUpperCase()} REMOVED FROM ${HIGHLIGHT_FOLDER_LABEL}`;
  } catch (error) {
    authDetail.textContent = getErrorMessage(error, STRINGS.errors.itemCertificationFailed);
    if (trigger) {
      trigger.disabled = false;
    }
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

async function handleTripCoverRemoveClick(trigger) {
  if (!db || !isAdminViewEnabled()) {
    return;
  }

  const tripId = String(trigger.getAttribute("data-trip-id") || "");
  const tripIndex = trips.findIndex((entry) => entry.id === tripId);
  const trip = tripIndex >= 0 ? trips[tripIndex] : null;

  if (!trip || (!trip.coverImageStoragePath && !trip.coverImageURL)) {
    return;
  }

  trigger.disabled = true;

  try {
    await setDoc(
      doc(db, runtimeConfig.collections.trips, trip.id),
      {
        coverImageURL: deleteField(),
        coverImageStoragePath: deleteField(),
        updatedAt: serverTimestamp(),
        updatedByUid: currentUser?.uid || "",
        updatedByEmail: currentUser?.email || "",
      },
      { merge: true }
    );

    if (storage && trip.coverImageStoragePath) {
      try {
        await deleteObject(storageRef(storage, trip.coverImageStoragePath));
      } catch (error) {
        if (!isStorageObjectMissing(error)) {
          throw error;
        }
      }
    }

    trips = trips.map((entry, index) =>
      entry.id === trip.id
        ? normalizeTrip(
            {
              ...entry,
              coverImageURL: "",
              coverImageStoragePath: "",
            },
            index
          )
        : entry
    );

    renderAll();
    authDetail.textContent = `${trip.slug.toUpperCase()} CARD IMAGE REMOVED.`;
  } catch (error) {
    authDetail.textContent = getErrorMessage(error, "Could not remove trip image.");
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

    if (featuredClip?.tripId === trip.id) {
      const siteSettingsRef = getSiteSettingsRef();

      if (siteSettingsRef) {
        await setDoc(
          siteSettingsRef,
          {
            featuredClip: deleteField(),
            updatedAt: serverTimestamp(),
            updatedByUid: currentUser?.uid || "",
            updatedByEmail: currentUser?.email || "",
          },
          { merge: true }
        );
      }

      featuredClip = null;
    }

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

    if (featuredClip?.tripId === tripId && featuredClip?.folderId === folderId) {
      const siteSettingsRef = getSiteSettingsRef();

      if (siteSettingsRef) {
        await setDoc(
          siteSettingsRef,
          {
            featuredClip: deleteField(),
            updatedAt: serverTimestamp(),
            updatedByUid: currentUser?.uid || "",
            updatedByEmail: currentUser?.email || "",
          },
          { merge: true }
        );
      }

      featuredClip = null;
    }

    const remainingFolders = getFoldersForTrip(tripId).filter((entry) => entry.id !== folderId);
    foldersByTrip.set(tripId, remainingFolders);

    if (selectedFolders.get(tripId) === folderId) {
      selectedFolders.set(tripId, "");
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
  if (storage && trip?.coverImageStoragePath) {
    try {
      await deleteObject(storageRef(storage, trip.coverImageStoragePath));
    } catch (error) {
      if (!isStorageObjectMissing(error)) {
        throw error;
      }
    }
  }

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
  const featuredItem = isFeaturedClipItem(item, tripId, folderId);

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

    if (featuredItem) {
      const siteSettingsRef = getSiteSettingsRef();

      if (siteSettingsRef) {
        await setDoc(
          siteSettingsRef,
          {
            featuredClip: deleteField(),
            updatedAt: serverTimestamp(),
            updatedByUid: currentUser?.uid || "",
            updatedByEmail: currentUser?.email || "",
          },
          { merge: true }
        );

        featuredClip = null;
      }
    }

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

  if (trigger) {
    handleProfileDeleteClick(trigger);
    return;
  }

  const profileCard = event.target.closest("[data-profile-href]");

  if (!profileCard) {
    return;
  }

  if (
    event.target.closest(
      "a[href], button, input, textarea, select, label, summary, details, form"
    )
  ) {
    return;
  }

  const profileHref = String(profileCard.getAttribute("data-profile-href") || "").trim();

  if (!profileHref) {
    return;
  }

  beginRouteLoadingOverlay();
  window.requestAnimationFrame(() => {
    navigateToRoute(normalizeRoute(profileHref));
  });
}

function handleProfileCardKeydown(event) {
  if (
    event.defaultPrevented ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    (event.key !== "Enter" && event.key !== " ")
  ) {
    return;
  }

  const profileCard = event.target.closest("[data-profile-href]");

  if (!profileCard || event.target !== profileCard) {
    return;
  }

  const profileHref = String(profileCard.getAttribute("data-profile-href") || "").trim();

  if (!profileHref) {
    return;
  }

  event.preventDefault();
  beginRouteLoadingOverlay();
  window.requestAnimationFrame(() => {
    navigateToRoute(normalizeRoute(profileHref));
  });
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

async function handleFriendDisplayNameEditClick(trigger) {
  if (!db || !runtimeConfig?.collections?.users || !isAdminViewEnabled()) {
    return;
  }

  const userId = String(trigger.getAttribute("data-user-id") || "");
  const friend = friends.find((item) => item.uid === userId || item.id === userId);

  if (!userId || !friend) {
    return;
  }

  const currentValue = friend.displayName || "";
  const nextValue = window.prompt(
    `Edit display name for ${getFriendLabel(friend)}.`,
    currentValue
  );

  if (nextValue === null) {
    return;
  }

  const nextDisplayName = normalizeDisplayName(nextValue);
  trigger.disabled = true;

  try {
    await setDoc(
      doc(db, runtimeConfig.collections.users, userId),
      {
        uid: friend.uid || userId,
        email: friend.email || "",
        displayName: nextDisplayName,
        googleName: normalizePersonName(friend.googleName || getFriendGoogleName(friend)),
        routeId: normalizeRouteId(friend.routeId),
        photoURL: friend.photoStoragePath ? friend.photoURL || "" : "",
        photoStoragePath: friend.photoStoragePath || "",
        role: friend.role || ROLE_FRIEND,
        isAdmin: isElevatedRole(friend.role || ROLE_FRIEND),
        updatedAt: serverTimestamp(),
        updatedByUid: currentUser?.uid || "",
        updatedByEmail: currentUser?.email || "",
      },
      { merge: true }
    );

    if (currentUser?.uid === userId && currentUserProfile) {
      currentUserProfile = normalizeFriend({
        ...currentUserProfile,
        displayName: nextDisplayName,
      });
    }

    authDetail.textContent = `${getFriendLabel(friend).toUpperCase()} DISPLAY NAME UPDATED.`;
  } catch (error) {
    authDetail.textContent = getErrorMessage(error, "Could not update display name.");
    trigger.disabled = false;
  }
}

// -----------------------------------------------------------------------------
// Top-Level Rendering
// -----------------------------------------------------------------------------
// `renderAll()` is the broad repaint used after auth, route, admin, and data
// changes. Smaller render helpers below are safe to call for targeted refreshes.
function renderAll() {
  recentMediaViews = pruneRecentMediaViews(recentMediaViews);
  syncResponsivePanels();

  if (!ensureAuthenticatedGoogleSession()) {
    syncCommentNotificationControls();
    syncScrollBannerVisibility();
    return;
  }

  renderFeaturedMessage();
  renderFeaturedClip();
  renderAuth();
  renderRouteChrome();
  renderCurrentPage();
  renderTripCount();
  syncCommentNotificationControls();
  renderFooterTicker();
  renderFooterRouteLinks();
  renderVisibleRouteContent();
  if (videoPreviewModalOpen) {
    syncVideoPreviewComments(getCurrentVideoPreviewState());
  }
  if (threadModalOpen) {
    renderThreadDialog();
  }
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
  syncMobileMenuToggleContent();
  const routeToggleLabel = shouldRouteToggleToArchive()
    ? STRINGS.auth.archive
    : STRINGS.auth.profile;

  if (desktopRouteToggleLink) {
    desktopRouteToggleLink.textContent = routeToggleLabel;
  }

  if (bannerRouteToggleLink) {
    bannerRouteToggleLink.textContent = routeToggleLabel;
  }

  if (mobileMenuArchiveButton) {
    mobileMenuArchiveButton.textContent = STRINGS.auth.archive;
  }

  if (mobileMenuProfileButton) {
    mobileMenuProfileButton.textContent = STRINGS.auth.profile;
  }

  setElementVisible(desktopRouteToggleLink, hasArchiveAccess, "inline-flex");
  setElementVisible(desktopActivityButton, hasArchiveAccess, "inline-flex");
  setElementVisible(bannerRouteToggleLink, hasArchiveAccess, "inline-flex");
  setElementVisible(bannerActivityButton, hasArchiveAccess, "inline-flex");

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
    setGoogleButtonVisible(false);
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
  const showArchive = currentRoute?.kind === ROUTE_ARCHIVE && canUploadMedia();
  const showProfile = isProfileRoute() && canUploadMedia();
  const showFeed = isFeedRoute() && canUploadMedia();
  const showMembers = isMembersRoute() && canUploadMedia();
  const showPrivacy = currentRoute?.kind === ROUTE_PRIVACY;
  const showTos = currentRoute?.kind === ROUTE_TOS;

  archivePage?.classList.toggle("hidden", !showArchive);
  profilePage?.classList.toggle("hidden", !showProfile);
  feedPage?.classList.toggle("hidden", !showFeed);
  membersPage?.classList.toggle("hidden", !showMembers);
  privacyPage?.classList.toggle("hidden", !showPrivacy);
  tosPage?.classList.toggle("hidden", !showTos);
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

function renderFooterRouteLinks() {
  [
    [footerPrivacyLink, ROUTE_PRIVACY],
    [footerTosLink, ROUTE_TOS],
  ].forEach(([element, routeKind]) => {
    if (!element) {
      return;
    }

    const isActive = currentRoute?.kind === routeKind;
    element.dataset.active = String(isActive);

    if (isActive) {
      element.setAttribute("aria-current", "page");
    } else {
      element.removeAttribute("aria-current");
    }
  });
}

function syncControlPanelVisibility() {
  const signedIn = canUploadMedia();
  const adminMode = signedIn && isAdminViewEnabled();

  adminPanel?.classList.toggle("hidden", !adminMode || isProfileRoute() || isMembersRoute() || isFeedRoute() || isLegalRoute());
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

function renderMembersPage() {
  const visibleMembers = getVisibleMembers();
  const onlineMembers = getOnlineMembers(visibleMembers);
  const authoredCounts = new Map(
    visibleMembers.map((friend) => [friend.uid || friend.id, countAuthoredItemsForUser(friend)])
  );
  const statusText = !currentUser?.uid
    ? "SIGN IN TO VIEW MEMBERS."
    : friendAccessIssue
      ? STRINGS.auth.rulesBlocked
      : visibleMembers.length === 0
        ? STRINGS.members.empty
        : "ALL MEMBERS";

  if (membersPageStatus) {
    membersPageStatus.textContent = statusText;
  }

  if (membersPageCount) {
    membersPageCount.textContent = formatPlainMemberCount(visibleMembers.length);
  }

  if (membersPageOnline) {
    membersPageOnline.textContent = formatOnlineMemberCount(onlineMembers.length);
  }

  if (membersPageList) {
    membersPageList.innerHTML = visibleMembers.length > 0
      ? visibleMembers
          .map((friend) =>
            renderFriendCard(friend, authoredCounts.get(friend.uid || friend.id) || 0)
          )
          .join("")
      : renderEmptySocialState(STRINGS.members.empty);
  }
}

function renderFeedPageIfVisible() {
  if (isFeedRoute()) {
    renderFeedPage();
  }
}

function handleFeedScopeChange(event) {
  const nextScope = event?.target?.value === FEED_SCOPE_YOURS
    ? FEED_SCOPE_YOURS
    : FEED_SCOPE_ALL;

  if (feedActivityScope === nextScope) {
    return;
  }

  feedActivityScope = nextScope;
  renderFeedPage();
}

// Renders the single Activity Feed box. The radio selector only changes which
// derived list is displayed: All Activity excludes replies, Your Activity
// includes personally relevant comments, replies, wall posts, uploads, and likes.
function renderFeedPage() {
  syncFeedScopeControls();

  if (!canUploadMedia()) {
    setFeedStatus("SIGN IN TO VIEW ACTIVITY.");
    if (feedAllList) {
      feedAllList.innerHTML = "";
    }
    return;
  }

  const allEntries = buildAllFeedEntries();
  syncFeedLikeSubscriptions(allEntries);
  const yourEntries = buildYourFeedEntries(allEntries);
  const activeEntries = feedActivityScope === FEED_SCOPE_YOURS ? yourEntries : allEntries;
  const activeScope = feedActivityScope === FEED_SCOPE_YOURS ? "yours" : "all";
  const emptyMessage = feedActivityScope === FEED_SCOPE_YOURS
    ? "NOTHING FOR YOU YET."
    : "NO ACTIVITY YET.";

  setFeedStatus(
    allEntries.length > 0
      ? `${buildCountLabel(allEntries.length, "ACTIVITY")} // ${buildCountLabel(yourEntries.length, "PERSONAL")}`
      : "NO ACTIVITY YET."
  );

  if (feedAllCount) {
    feedAllCount.innerHTML = renderFeedScopeCountMarkup(
      buildCountLabel(allEntries.length, "ITEM"),
      getNewActivityNotificationCount()
    );
  }

  if (feedYourCount) {
    feedYourCount.textContent = buildCountLabel(yourEntries.length, "ITEM");
  }

  if (feedAllList) {
    feedAllList.innerHTML = activeEntries.length > 0
      ? activeEntries.map((entry) => renderFeedEntry(entry, activeScope)).join("")
      : renderEmptySocialState(emptyMessage);
  }

  scheduleCommentNotificationViewportObserverSync();
}

function setFeedStatus(message) {
  if (feedPageStatus) {
    feedPageStatus.textContent = message || "";
  }
}

function syncFeedScopeControls() {
  if (feedScopeAllInput) {
    feedScopeAllInput.checked = feedActivityScope !== FEED_SCOPE_YOURS;
  }

  if (feedScopeYourInput) {
    feedScopeYourInput.checked = feedActivityScope === FEED_SCOPE_YOURS;
  }
}

function buildAllFeedEntries() {
  const rootEntries = getUniqueFeedRootActivities()
    .filter((entry) => entry.type === "media-comment" || entry.type === "wall-post")
    .map((entry) => ({ ...entry, feedType: entry.type }));
  feedUploadItems = getFeedUploadItemsFromLoadedFolders();
  const uploadEntries = feedUploadItems
    .filter((item) => item.kind === "file")
    .map((item) => buildUploadFeedEntry(item))
    .filter(Boolean);

  return [...rootEntries, ...uploadEntries]
    .sort(compareFeedEntriesByTime)
    .slice(0, 120);
}

function getFeedUploadItemsFromLoadedFolders() {
  const byKey = new Map();

  itemsByFolder.forEach((items, cacheKey) => {
    const [, tripId, folderId] = String(cacheKey || "").split(":");

    (items || []).forEach((item) => {
      if (item?.kind !== "file" || !tripId || !folderId || isHighlightFolder(folderId)) {
        return;
      }

      const normalizedItem = {
        ...item,
        tripId: item.tripId || tripId,
        folderId: item.folderId || folderId,
      };
      byKey.set(`${tripId}:${folderId}:${item.id}`, normalizedItem);
    });
  });

  return [...byKey.values()].sort(compareFeedEntriesByTime);
}

function buildYourFeedEntries(allEntries = buildAllFeedEntries()) {
  const uid = String(currentUser?.uid || "");

  if (!uid) {
    return [];
  }

  const rootEntries = getUniqueFeedRootActivities();
  const rootByThreadKey = new Map(
    rootEntries
      .map((entry) => [buildThreadKey(getThreadOwnerUid(entry), entry.id), entry])
      .filter(([threadKey]) => Boolean(threadKey))
  );
  const participantThreadKeys = new Set();

  rootByThreadKey.forEach((entry, threadKey) => {
    if (isRootFeedEntryRelevantToUser(entry, uid)) {
      participantThreadKeys.add(threadKey);
    }
  });

  feedReplyEntries.forEach((reply) => {
    if (reply.actorUid === uid) {
      const threadKey = buildThreadKey(reply.threadOwnerUid, reply.activityId);
      if (threadKey) {
        participantThreadKeys.add(threadKey);
      }
    }
  });

  const personalRoots = rootEntries
    .filter((entry) => isRootFeedEntryRelevantToUser(entry, uid))
    .map((entry) => ({ ...entry, feedType: entry.type }));
  const personalReplies = feedReplyEntries
    .filter((reply) => {
      const threadKey = buildThreadKey(reply.threadOwnerUid, reply.activityId);
      return reply.actorUid === uid || participantThreadKeys.has(threadKey);
    })
    .map((reply) => ({
      ...reply,
      feedType: "thread-reply",
      rootEntry: rootByThreadKey.get(buildThreadKey(reply.threadOwnerUid, reply.activityId)) || null,
    }));
  const personalLikes = buildPersonalLikeFeedEntries(uid);

  return [...personalRoots, ...personalReplies, ...personalLikes]
    .sort(compareFeedEntriesByTime)
    .slice(0, 120);
}

function getUniqueFeedRootActivities() {
  const byKey = new Map();

  feedRootActivities.forEach((entry) => {
    if (!entry?.id || !entry?.type) {
      return;
    }

    const key = `${entry.type}:${entry.id}`;
    const existing = byKey.get(key);

    if (!existing || shouldPreferFeedActivityDoc(entry, existing)) {
      byKey.set(key, entry);
    }
  });

  return [...byKey.values()].sort(compareFeedEntriesByTime);
}

function shouldPreferFeedActivityDoc(nextEntry, existingEntry) {
  if (nextEntry.type === "wall-post") {
    return nextEntry.activityOwnerUid === nextEntry.targetUserUid && existingEntry.activityOwnerUid !== existingEntry.targetUserUid;
  }

  return Number(nextEntry.createdAtMs || 0) > Number(existingEntry.createdAtMs || 0);
}

function isRootFeedEntryRelevantToUser(entry, uid) {
  if (!entry || !uid) {
    return false;
  }

  if (entry.type === "wall-post") {
    return entry.actorUid === uid || entry.targetUserUid === uid;
  }

  if (entry.type === "media-comment") {
    return (
      getSocialCommentAuthorUid(entry) === uid ||
      isFeedMediaItemAuthoredByUser(entry.tripId, entry.folderId, entry.itemId, uid)
    );
  }

  return false;
}

function buildUploadFeedEntry(item) {
  if (!item?.id) {
    return null;
  }

  const trip = trips.find((entry) => entry.id === item.tripId) || null;
  const folder = getFoldersForTrip(item.tripId).find((entry) => entry.id === item.folderId) || null;
  const authorFriend = resolveItemAuthorFriend(item);
  const actorUid = getItemAuthorUid(item);
  const actorLabel = resolveItemAuthorLabel(item) || STRINGS.brand;

  return {
    id: `upload:${item.tripId}:${item.folderId}:${item.id}`,
    feedType: "upload",
    type: "upload",
    item,
    itemId: item.id,
    itemName: getItemDisplayName(item),
    tripId: item.tripId,
    folderId: item.folderId,
    sourceLabel: buildFolderPathLabel(trip, folder).replace(/\/$/, ""),
    actorUid,
    actorLabel,
    actorRouteId: getItemAuthorRouteId(item),
    actorPhotoURL: authorFriend ? getFriendPhotoUrl(authorFriend) : "",
    createdAtMs: item.createdAtMs,
  };
}

function buildPersonalLikeFeedEntries(uid) {
  return feedLikeEvents
    .map((event) => buildPersonalLikeFeedEntry(event, uid))
    .filter(Boolean);
}

function buildPersonalLikeFeedEntry(event, uid) {
  if (!event || !uid || event.actorUid === uid) {
    return null;
  }

  const target = resolveLikeFeedTarget(event);

  if (!target || target.authorUid !== uid) {
    return null;
  }

  const actorFriend = getFriendByUid(event.actorUid);

  return {
    id: `like:${event.targetKey}:${event.actorUid}`,
    feedType: "like",
    type: "feed-like",
    targetKind: event.targetKind,
    target,
    actorUid: event.actorUid,
    actorLabel: getFriendLabel(actorFriend) || event.actorUid,
    actorRouteId: normalizeRouteId(actorFriend?.routeId),
    actorPhotoURL: getFriendPhotoUrl(actorFriend),
    createdAtMs: event.createdAtMs,
  };
}

function resolveLikeFeedTarget(event) {
  if (event.targetKind === "media-item") {
    const item = getFeedMediaItem(event.tripId, event.folderId, event.itemId);

    if (!item) {
      return null;
    }

    return {
      kind: "media",
      label: getItemDisplayName(item),
      sourceLabel: buildItemSourceLabel(event.tripId, event.folderId),
      authorUid: getItemAuthorUid(item),
      tripId: event.tripId,
      folderId: event.folderId,
      itemId: event.itemId,
      item,
    };
  }

  if (event.targetKind === "wall-post" || event.targetKind === "media-comment") {
    const rootEntry = getUniqueFeedRootActivities().find((entry) =>
      event.targetKind === "wall-post"
        ? entry.id === event.activityId && entry.type === "wall-post"
        : entry.id === event.commentId && entry.type === "media-comment"
    );

    if (!rootEntry) {
      return null;
    }

    return {
      kind: rootEntry.type === "wall-post" ? "wall post" : "comment",
      label: rootEntry.type === "media-comment" ? rootEntry.itemName || "MEDIA COMMENT" : "WALL POST",
      sourceLabel: rootEntry.sourceLabel || buildThreadContextLabel(rootEntry),
      authorUid: rootEntry.actorUid || rootEntry.authorUid,
      rootEntry,
    };
  }

  if (event.targetKind === "thread-reply") {
    const reply = feedReplyEntries.find(
      (entry) =>
        entry.threadOwnerUid === event.threadOwnerUid &&
        entry.activityId === event.activityId &&
        entry.id === event.replyId
    );

    if (!reply) {
      return null;
    }

    return {
      kind: "reply",
      label: "THREAD REPLY",
      sourceLabel: "",
      authorUid: reply.actorUid,
      reply,
    };
  }

  return null;
}

function renderFeedEntry(entry, scope = "all") {
  if (entry.feedType === "upload") {
    return renderUploadFeedEntry(entry);
  }

  if (entry.feedType === "thread-reply") {
    return renderReplyFeedEntry(entry);
  }

  if (entry.feedType === "like") {
    return renderLikeFeedEntry(entry);
  }

  return renderRootFeedEntry(entry, scope);
}

function renderRootFeedEntry(entry, scope = "all") {
  const sourceCardMarkup = entry.type === "media-comment"
    ? renderFeedMediaSourceCard(entry)
    : "";
  const wallTargetLinkMarkup = entry.type === "wall-post" ? renderWallTargetLink(entry) : "";
  const interactionMarkup = renderSocialInteractionBar(entry);
  const notificationKeys = getActivityNotificationKeysForEntry(entry);
  const unreadActivityNotification = notificationKeys.length > 0;
  const headerMetaMarkup = [
    scope === "yours" ? `<span class="text-sky-100/62">YOUR ACTIVITY</span>` : "",
    renderUnreadActivityNotificationBadge(entry, { label: "NEW" }),
  ]
    .filter(Boolean)
    .join("");
  const articleAttrs = entry.type === "media-comment"
    ? renderActivitySourceAttributes(entry)
    : entry.type === "wall-post"
      ? renderWallPostThreadAttributes(entry)
      : "";
  const actionLabel = entry.type === "media-comment"
    ? "COMMENTED ON MEDIA"
    : buildActivityActionLabel(entry, getFriendByUid(entry.targetUserUid), entry.targetUserUid === currentUser?.uid);

  return renderSocialEntryCard(entry, {
    articleAttrs: `${articleAttrs}${unreadActivityNotification ? renderFeedNotificationAttributes(notificationKeys) : ""}`,
    interactive: entry.type === "media-comment" || entry.type === "wall-post",
    title: entry.type === "media-comment"
      ? "Open source item and thread"
      : entry.type === "wall-post"
        ? "Open wall post thread"
        : "",
    cardClass: unreadActivityNotification
      ? "border-red-300/38 bg-red-500/[0.07] shadow-[0_0_0_1px_rgba(248,113,113,0.08),0_18px_44px_rgba(127,29,29,0.08)]"
      : "",
    controlsMarkup: renderSocialEntryTypeControls(entry),
    headerMetaMarkup,
    actionLabel,
    bodyMarkup: renderEditableSocialEntryContent(entry),
    secondaryMarkup: sourceCardMarkup,
    interactionMarkup,
    footerMarkup: wallTargetLinkMarkup,
  });
}

function renderUploadFeedEntry(entry) {
  const actorMarkup = renderSocialActorLink(
    entry.actorLabel,
    entry.actorRouteId,
    "text-stone-100 transition hover:text-white hover:underline"
  );
  const previewUrl = getFeedItemPreviewUrl(entry.item);
  const sourceAttrs = renderActivitySourceAttributes({ ...entry, id: "" });
  const articleAttrs = `${sourceAttrs} title="Open uploaded media"`;

  return `
    <article ${articleAttrs} class="cursor-pointer border border-white/10 bg-black/24 p-3 transition hover:border-white/22 hover:bg-black/32 sm:p-4">
      <div class="flex items-start gap-3">
        <img src="${escapeHtml(getSocialPhotoUrl(entry.actorPhotoURL))}" alt="${escapeHtml(entry.actorLabel)}" class="h-10 w-10 shrink-0 border border-white/10 bg-black object-cover object-center">
        <div class="min-w-0 flex-1">
          <div class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.62rem] uppercase tracking-[0.16em]">
            ${actorMarkup}
            <span class="text-stone-400/58">${escapeHtml(formatActivityTime(entry.createdAtMs))}</span>
          </div>
          <p class="mt-1 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.58rem] uppercase tracking-[0.16em] text-stone-300/58">UPLOADED MEDIA</p>
          <button type="button" ${sourceAttrs} class="mt-3 flex w-full min-w-0 items-stretch overflow-hidden border border-white/10 bg-black/30 text-left transition hover:border-white/24 hover:bg-black/38">
            ${previewUrl ? `<img src="${escapeHtml(previewUrl)}" alt="" class="h-20 w-24 shrink-0 object-cover">` : `<span class="flex h-20 w-24 shrink-0 items-center justify-center bg-white/[0.04] text-[0.58rem] uppercase tracking-[0.14em] text-stone-400/70">Media</span>`}
            <span class="min-w-0 flex-1 px-3 py-2">
              <span class="block break-words text-sm uppercase tracking-[0.12em] text-stone-100 [overflow-wrap:anywhere]">${escapeHtml(entry.itemName)}</span>
              <span class="mt-1 block font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.58rem] uppercase tracking-[0.14em] text-stone-400/72">${escapeHtml(entry.sourceLabel)}</span>
            </span>
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderReplyFeedEntry(entry) {
  const rootEntry = entry.rootEntry || getRootActivityByThread(entry.threadOwnerUid, entry.activityId);
  const sourceCardMarkup = rootEntry?.type === "media-comment"
    ? renderFeedMediaSourceCard(rootEntry)
    : "";
  const threadContext = {
    threadOwnerUid: entry.threadOwnerUid,
    activityId: entry.activityId,
  };

  return renderSocialEntryCard(entry, {
    controlsMarkup: renderSocialEntryTypeControls(entry),
    actionLabel: buildReplyFeedContextLabel(rootEntry),
    bodyMarkup: renderEditableSocialEntryContent(entry),
    secondaryMarkup: sourceCardMarkup,
    interactionMarkup: renderSocialInteractionBar(entry, { includeReplyCount: false }),
    footerMarkup: `
      <div class="mt-3">
        <button type="button" data-action="open-thread" ${renderThreadActionAttributes(threadContext)} class="${getSocialActionButtonClass()}">
          Thread
        </button>
      </div>
    `,
  });
}

function renderLikeFeedEntry(entry) {
  const actorMarkup = renderSocialActorLink(
    entry.actorLabel,
    entry.actorRouteId,
    "text-stone-100 transition hover:text-white hover:underline"
  );
  const target = entry.target || {};
  const sourceAttrs = target.tripId && target.folderId && target.itemId
    ? renderActivitySourceAttributes({
        tripId: target.tripId,
        folderId: target.folderId,
        itemId: target.itemId,
        id: "",
      })
    : "";

  return `
    <article class="border border-sky-200/18 bg-sky-100/[0.035] p-3 sm:p-4">
      <div class="flex items-start gap-3">
        <img src="${escapeHtml(getSocialPhotoUrl(entry.actorPhotoURL))}" alt="${escapeHtml(entry.actorLabel)}" class="h-9 w-9 shrink-0 border border-sky-100/16 bg-black object-cover object-center">
        <div class="min-w-0 flex-1">
          <div class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.62rem] uppercase tracking-[0.16em]">
            ${actorMarkup}
            <span class="text-stone-400/58">${escapeHtml(formatActivityTime(entry.createdAtMs))}</span>
          </div>
          <p class="mt-1 break-words font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.58rem] uppercase tracking-[0.16em] text-sky-100/72">LIKED YOUR ${escapeHtml(String(target.kind || "POST").toUpperCase())}</p>
          <button type="button" ${sourceAttrs} class="mt-3 block w-full border border-white/10 bg-black/22 px-3 py-2 text-left transition hover:border-white/24 hover:bg-black/34 ${sourceAttrs ? "" : "pointer-events-none"}">
            <span class="block break-words text-sm uppercase tracking-[0.12em] text-stone-100 [overflow-wrap:anywhere]">${escapeHtml(target.label || "ACTIVITY")}</span>
            ${target.sourceLabel ? `<span class="mt-1 block font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.58rem] uppercase tracking-[0.14em] text-stone-400/72">${escapeHtml(target.sourceLabel)}</span>` : ""}
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderFeedMediaSourceCard(entry) {
  const item = getFeedMediaItem(entry.tripId, entry.folderId, entry.itemId);
  const previewUrl = getFeedItemPreviewUrl(item);
  const sourceLabel = entry.sourceLabel || buildItemSourceLabel(entry.tripId, entry.folderId);
  const itemName = entry.itemName || (item ? getItemDisplayName(item) : "MEDIA");

  return `
    <div class="mt-3 flex min-w-0 overflow-hidden border border-white/10 bg-black/30">
      ${previewUrl ? `<img src="${escapeHtml(previewUrl)}" alt="" class="h-20 w-24 shrink-0 object-cover">` : `<span class="flex h-20 w-24 shrink-0 items-center justify-center bg-white/[0.04] text-[0.58rem] uppercase tracking-[0.14em] text-stone-400/70">Media</span>`}
      <div class="min-w-0 flex-1 px-3 py-2">
        <p class="break-words text-sm uppercase tracking-[0.12em] text-stone-100 [overflow-wrap:anywhere]">${escapeHtml(itemName)}</p>
        <p class="mt-1 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.58rem] uppercase tracking-[0.14em] text-stone-400/72">${escapeHtml(sourceLabel)}</p>
      </div>
    </div>
  `;
}

function buildReplyFeedContextLabel(rootEntry) {
  if (!rootEntry) {
    return "REPLIED IN THREAD";
  }

  if (rootEntry.type === "media-comment") {
    return `REPLIED TO COMMENT // ${rootEntry.itemName || rootEntry.sourceLabel || "MEDIA"}`;
  }

  if (rootEntry.type === "wall-post") {
    return `REPLIED ON ${normalizeSocialLabel(rootEntry.targetUserLabel || getFriendLabel(getFriendByUid(rootEntry.targetUserUid))).toUpperCase()}'S WALL`;
  }

  return "REPLIED IN THREAD";
}

function getRootActivityByThread(threadOwnerUid, activityId) {
  return getUniqueFeedRootActivities().find(
    (entry) => getThreadOwnerUid(entry) === threadOwnerUid && entry.id === activityId
  ) || null;
}

function getFeedMediaItem(tripId, folderId, itemId) {
  return getItemsForFolder(tripId, folderId).find((item) => item.id === itemId) ||
    feedUploadItems.find(
      (item) => item.tripId === tripId && item.folderId === folderId && item.id === itemId
    ) ||
    null;
}

function getFeedItemPreviewUrl(item) {
  if (!item) {
    return "";
  }

  return item.posterDownloadURL || item.downloadURL || "";
}

function isFeedMediaItemAuthoredByUser(tripId, folderId, itemId, uid) {
  const item = getFeedMediaItem(tripId, folderId, itemId);
  return Boolean(item && getItemAuthorUid(item) === uid);
}

function compareFeedEntriesByTime(left, right) {
  return Number(right?.createdAtMs || 0) - Number(left?.createdAtMs || 0);
}

// -----------------------------------------------------------------------------
// Archive And Profile Trip Rendering
// -----------------------------------------------------------------------------
// Current archive/profile folder UI is composed by `renderTripSections()` so the
// main archive and member profile pages share the same mobile-safe structure.
function renderTrips() {
  if (!tripList) {
    return;
  }

  tripList.innerHTML = renderTripSections({ view: "archive" });
  return;

  // Legacy inline trip renderer kept unreachable for now while the shared
  // `renderTripSections()` path settles. Remove during the next cleanup pass.
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
      const selectedFolder = folders.find((folder) => folder.id === selectedFolderId) || null;
      const activeFolderId = selectedFolder?.id || "";
      const sortMode = getItemSortMode(trip.id, activeFolderId);
      const items = selectedFolder
        ? getSortedItemsForFolder(trip.id, activeFolderId, sortMode)
        : [];
      const pathLabel = buildFolderPathLabel(trip, selectedFolder);
      const expanded = isTripExpanded(trip.id);
      const tripToggleIndicatorMarkup = renderTripToggleIndicator(expanded);
      const tripShellClass = expanded
        ? "border border-white/10  bg-white/[0.02]"
        : "border border-white/10 bg-white/[0.02]";
      const tripHeaderClass = expanded
        ? "relative flex flex-col gap-3 border-b border-white/10 bg-[linear-gradient(to_right,rgba(38,38,38,0.08),rgba(255,255,255,0.008)_42%,transparent)] px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5"
        : "relative flex flex-col gap-3 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5";
      const tripContentClass = expanded
        ? "grid gap-5 bg-[linear-gradient(to_bottom,rgba(88, 88, 88, 0.25),rgba(15, 15, 15, 0.01))] p-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:p-5"
        : "hidden gap-5 p-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:p-5";

      return `
        <section class="${tripShellClass}">
          <div class="${tripHeaderClass}">
            ${tripToggleIndicatorMarkup}
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
  const isMembersMode = isMembersRoute();
  const isFeedMode = isFeedRoute();
  const isLegalMode = isLegalRoute();
  const routeContextLabel = buildRouteContextLabel(profileView);
  const pageKind = isProfileMode ? "profile" : isMembersMode ? "members" : isFeedMode ? "feed" : isLegalMode ? "legal" : "archive";

  if (siteShell) {
    siteShell.dataset.page = pageKind;
  }

  if (scrollBanner) {
    scrollBanner.dataset.page = pageKind;
  }

  if (headerRouteContext) {
    headerRouteContext.textContent = routeContextLabel;
    headerRouteContext.classList.toggle("hidden", !routeContextLabel);
  }

  if (scrollBannerContext) {
    scrollBannerContext.textContent = routeContextLabel;
    scrollBannerContext.classList.toggle("hidden", !routeContextLabel);
  }
}

function buildRouteContextLabel(profileView) {
  if (currentRoute?.kind === ROUTE_PRIVACY) {
    return "LEGAL // PRIVACY POLICY";
  }

  if (currentRoute?.kind === ROUTE_TOS) {
    return "LEGAL // TERMS OF SERVICE";
  }

  if (isMembersRoute()) {
    return "MEMBERS";
  }

  if (isFeedRoute()) {
    return "ACTIVITY FEED";
  }

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
  const canAdminEditOtherProfile = Boolean(isReady && !isSelf && isAdminViewEnabled());
  const authoredCount = isReady ? countAuthoredItemsForUser(friend) : 0;
  const tripMarkup = isReady
    ? renderTripSections({ view: "profile", profileFriend: friend })
    : "";
  const hasAuthoredContent = Boolean(tripMarkup.trim());
  syncProfileActivitySubscription(isReady ? friend.uid : "");
  renderProfileActivityPanel(friend, isReady, isSelf, profileView);

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
    profileDetailsForm.dataset.targetUserId = isReady ? friend.uid || "" : "";
    profileDetailsForm.classList.toggle("hidden", !(isSelf || canAdminEditOtherProfile));
  }

  if (profileDisplayNameInput) {
    profileDisplayNameInput.value = isReady ? friend.displayName || "" : "";
  }

  if (profileRouteInput) {
    profileRouteInput.value = isReady ? friend.routeId || "" : "";
    profileRouteInput.toggleAttribute("disabled", !isSelf);
  }

  if (profileRouteField) {
    profileRouteField.classList.toggle("hidden", !isSelf);
  }

  if (profileDetailsSubmit) {
    profileDetailsSubmit.textContent = isSelf ? "Save Changes" : "Update Display Name";
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
    ? "min-w-0 border border-transparent bg-black/20 p-2 sm:p-4 lg:p-5"
    : `min-w-0 border ${isProfileView ? "border-white/10 bg-black/28" : "border-white/10 bg-black/20"} p-2 sm:p-4 lg:p-5`;
  const panelStyle = highlightFolderSelected ? getHighlightPanelStyle() : "";
  const pathMarkup = highlightFolderSelected
    ? `<span style="${getHighlightPanelTextStyle()}">${escapeHtml(pathLabel)}</span>`
    : escapeHtml(pathLabel);
  const showSourceColumn = highlightFolderSelected;
  const tableMinWidthClass = showSourceColumn ? "min-w-[56rem]" : "min-w-[48rem]";
  const mobileControlsMarkup = `
    <p class="mb-3 border-b border-white/10 pb-3 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.58rem] uppercase tracking-[0.14em] ${isProfileView ? "text-stone-300/68" : "text-stone-300/60"}">
      ${isProfileView ? buildMemberPostCountLabel(items.length) : padCount(items.length, STRINGS.trips.objectsLabel)}
    </p>
    <label class="block font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.58rem] uppercase tracking-[0.16em] ${isProfileView ? "text-stone-300/68" : "text-stone-300/62"}">
      <span class="mb-2 block">${STRINGS.items.sortLabel}</span>
      <select
        data-action="sort-items"
        data-view="${escapeHtml(view)}"
        data-trip-id="${escapeHtml(trip.id)}"
        class="w-full border ${isProfileView ? "border-white/12 bg-white/[0.03]" : "border-white/10 bg-black/45"} px-2 py-2 text-[0.58rem] uppercase tracking-[0.12em] text-stone-200 outline-none transition focus:border-white/30"
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
            class="mt-3 w-full border border-sky-300/32 bg-sky-100/[0.03] px-2.5 py-2 text-left font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.58rem] uppercase tracking-[0.14em] text-sky-100 transition hover:border-sky-200/55 hover:bg-sky-100/[0.08]"
          >
            Delete Folder
          </button>
        `
        : ""
    }
    ${contributeMarkup ? `<div class="mt-3 flex">${contributeMarkup}</div>` : ""}
  `;

  return `
    <div class="${responsiveClass} ${panelShellClass}"${panelStyle ? ` style="${panelStyle}"` : ""}>
      <div class="sticky top-0 z-20 -mx-2 border-b border-white/10 bg-neutral-950/95 px-2 py-2 backdrop-blur sm:-mx-3 sm:px-3 lg:hidden">
        <div class="flex min-w-0 items-center justify-between gap-3">
          <div class="min-w-0 flex-1">
            <p class="break-all font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.62rem] uppercase tracking-[0.16em] text-stone-400/72 [overflow-wrap:anywhere]">&gt; ${pathMarkup}</p>
          </div>
          <details class="relative shrink-0">
            <summary class="flex h-9 w-9 cursor-pointer list-none items-center justify-center border border-white/12 bg-black/40 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.72rem] leading-none tracking-[0.08em] text-stone-100 transition hover:border-white/30 hover:bg-white/[0.08]" aria-label="Folder controls">
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 5h18"></path>
                <path d="M7 12h10"></path>
                <path d="M10 19h4"></path>
              </svg>
            </summary>
            <div class="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-60 border border-white/12 bg-neutral-950/98 p-3 shadow-[0_18px_54px_rgba(0,0,0,0.5)]">
              ${mobileControlsMarkup}
            </div>
          </details>
        </div>
      </div>

      <div class="hidden flex-col gap-3 border-b border-white/10 pb-4 lg:flex">
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
                      class="border border-sky-300/32 bg-sky-100/[0.03] px-2.5 py-2 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.56rem] uppercase tracking-[0.14em] text-sky-100 transition hover:border-sky-200/55 hover:bg-sky-100/[0.08] sm:px-3 sm:text-[0.62rem] sm:tracking-[0.18em]"
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

      <div class="mt-3 max-w-full overflow-hidden rounded-sm border ${highlightFolderSelected ? "border-amber-300/28" : isProfileView ? "border-white/10" : "border-white/8"} bg-black/18 sm:mt-4">
        <div class="max-h-[68vh] overflow-y-auto px-1 py-1.5 sm:p-3 lg:hidden">
          ${renderMobileItemCards(items, trip.id, selectedFolder.id, view, { showSourceColumn })}
        </div>
        <div class="relative hidden max-h-[62vh] max-w-full overflow-x-auto overflow-y-auto overscroll-x-contain lg:block lg:max-h-[68vh] xl:max-h-[75vh]">
          <table class="w-max ${tableMinWidthClass} border-collapse font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.68rem] tracking-[0.06em] text-stone-200/85 sm:min-w-[52rem] sm:text-[0.72rem] sm:tracking-[0.07em] lg:min-w-[58rem] lg:text-[0.74rem] lg:tracking-[0.08em] xl:min-w-full">
            <thead class="bg-white/[0.02] text-stone-300/55 uppercase">
              <tr>
                <th class="sticky top-0 z-10 min-w-[4rem] border-b border-white/10 bg-neutral-950 px-2 py-2.5 text-left text-[0.62rem] font-normal leading-tight shadow-[0_1px_0_rgba(255,255,255,0.05)] sm:min-w-[4.5rem] sm:px-2.5 sm:py-3 sm:text-[0.66rem]">${STRINGS.items.previewColumn}</th>
                ${showSourceColumn ? `<th class="sticky top-0 z-10 min-w-[7rem] border-b border-white/10 bg-neutral-950 px-2 py-2.5 text-left font-normal shadow-[0_1px_0_rgba(255,255,255,0.05)] sm:min-w-[8rem] sm:px-2.5 sm:py-3">${STRINGS.items.sourceColumn}</th>` : ""}
                <th class="sticky top-0 z-10 min-w-[11rem] border-b border-white/10 bg-neutral-950 px-2 py-2.5 text-left font-normal shadow-[0_1px_0_rgba(255,255,255,0.05)] sm:min-w-[12rem] sm:px-2.5 sm:py-3">${STRINGS.items.nameColumn}</th>
                <th class="sticky top-0 z-10 min-w-[5rem] border-b border-white/10 bg-neutral-950 px-2 py-2.5 text-left font-normal shadow-[0_1px_0_rgba(255,255,255,0.05)] sm:min-w-[5.5rem] sm:px-2.5 sm:py-3">${STRINGS.items.typeColumn}</th>
                <th class="sticky top-0 z-10 min-w-[7rem] border-b border-white/10 bg-neutral-950 px-2 py-2.5 text-left font-normal shadow-[0_1px_0_rgba(255,255,255,0.05)] sm:min-w-[7.5rem] sm:px-2.5 sm:py-3">${STRINGS.items.authorColumn}</th>
                <th class="sticky top-0 z-10 min-w-[8rem] border-b border-white/10 bg-neutral-950 px-2 py-2.5 text-left font-normal shadow-[0_1px_0_rgba(255,255,255,0.05)] sm:min-w-[8.5rem] sm:px-2.5 sm:py-3">${STRINGS.items.certifiedColumn}</th>
                <th class="sticky top-0 z-10 min-w-[12rem] border-b border-white/10 bg-neutral-950 px-2 py-2.5 text-left font-normal shadow-[0_1px_0_rgba(255,255,255,0.05)] sm:min-w-[14rem] sm:px-2.5 sm:py-3">${STRINGS.items.metaColumn}</th>
              </tr>
            </thead>
            <tbody>
              ${renderItemRows(items, trip.id, selectedFolder.id, view, { showSourceColumn })}
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

function renderNoFolderSelectedPanel({
  isProfileView = false,
  responsiveClass = "",
} = {}) {
  return `
    <div class="${responsiveClass} min-w-0 border ${isProfileView ? "border-white/10 bg-black/28" : "border-white/10 bg-black/20"} p-5">
      <div class="border-b border-white/10 pb-4">
        <p class="font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.7rem] uppercase tracking-[0.24em] ${isProfileView ? "text-stone-300/68" : "text-stone-300/60"}">Active Folder</p>
        <p class="mt-3 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-sm uppercase tracking-[0.16em] text-stone-300/55">&gt; NO FOLDER SELECTED</p>
      </div>
    </div>
  `;
}

function renderTripToggleIndicator(expanded) {
  const points = expanded ? "8 42 32 18 56 42" : "8 22 32 46 56 22";

  return `
    <span
      aria-hidden="true"
      class="pointer-events-none absolute right-3 top-3 z-10 flex h-6 w-8 items-center justify-center text-stone-100/62 sm:right-4 sm:top-4 sm:h-7 sm:w-9"
    >
      <svg viewBox="0 0 64 64" class="h-full w-full" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="${points}"></polyline>
      </svg>
    </span>
  `;
}

function renderTripStatusTag(trip) {
  if (!isUpcomingTrip(trip)) {
    return "";
  }

  return `
    <span
      class="shrink-0 border px-2 py-1 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.56rem] uppercase tracking-[0.18em] sm:text-[0.62rem]"
      style="border-color:rgba(190,229,255,0.52);background-color:rgba(190,229,255,0.095);color:#d9f1ff;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.035),0 0 16px rgba(190,229,255,0.08);"
    >
      Upcoming
    </span>
  `;
}

function isUpcomingTrip(trip) {
  const status = String(trip?.status || "").toLowerCase();

  if (status === "upcoming") {
    return true;
  }

  const tripText = `${trip?.label || ""} ${trip?.slug || ""} ${trip?.id || ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");

  return /\b(kelowna|ktown|k town)\b/.test(tripText) && /\b26\b/.test(tripText);
}

function renderTripCoverMarkup(trip, expanded) {
  if (!trip?.coverImageURL) {
    return "";
  }

  const imageToneClass = expanded
    ? "opacity-35 grayscale-0"
    : "opacity-20 grayscale sm:group-hover:opacity-35 sm:group-hover:grayscale-0 sm:group-focus-within:opacity-35 sm:group-focus-within:grayscale-0";

  return `
    <div class="pointer-events-none absolute inset-y-0 left-0 z-0 w-[66%] overflow-hidden sm:w-[33%]">
      <img src="${escapeHtml(trip.coverImageURL)}" alt="${escapeHtml(trip.label || trip.slug)}" class="h-full w-full object-cover object-left transition duration-300 ${imageToneClass}">
      <div class="absolute inset-0 bg-[linear-gradient(to_right,rgba(8,8,8,0)_0%,rgba(8,8,8,0.04)_45%,rgba(8,8,8,0.38)_74%,rgba(8,8,8,0.96)_100%)]"></div>
    </div>
  `;
}

function renderTripSettingsMenu(trip) {
  if (!isAdminViewEnabled()) {
    return "";
  }

  const previewMarkup = trip.coverImageURL
    ? `
      <img src="${escapeHtml(trip.coverImageURL)}" alt="${escapeHtml(trip.label || trip.slug)}" class="mt-3 aspect-[16/10] w-full border border-white/10 object-cover object-left opacity-85 grayscale transition">
    `
    : `
      <p class="mt-3 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.54rem] uppercase tracking-[0.14em] text-stone-400/74">
        No trip card image set.
      </p>
    `;

  return `
    <details class="relative z-40 shrink-0" data-ignore-trip-toggle="true">
      <summary class="flex h-9 w-9 cursor-pointer list-none items-center justify-center border border-white/12 bg-black/40 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.72rem] leading-none tracking-[0.08em] text-stone-100 transition hover:border-white/30 hover:bg-white/[0.08] [&::-webkit-details-marker]:hidden" aria-label="Trip settings">
        ...
      </summary>
      <div class="absolute right-0 top-[calc(100%+0.5rem)] z-[70] w-64 border border-white/12 bg-neutral-950/98 p-3 shadow-[0_18px_54px_rgba(0,0,0,0.5)]">
        <p class="font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.58rem] uppercase tracking-[0.18em] text-stone-300/70">
          Trip Card Image
        </p>
        <p class="mt-2 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.54rem] uppercase tracking-[0.14em] text-stone-400/74">
          Hover image for this trip card. Mobile keeps it visible in black and white until open.
        </p>
        ${previewMarkup}
        <label class="mt-3 block font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.54rem] uppercase tracking-[0.14em] text-stone-300/70">
          <span class="mb-2 block">Upload Image</span>
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-action="trip-cover-upload" data-trip-id="${escapeHtml(trip.id)}" class="w-full border border-white/12 bg-black/40 px-3 py-2 text-[0.62rem] tracking-[0.08em] text-stone-100 outline-none transition file:mr-3 file:border-0 file:bg-white/8 file:px-2 file:py-1.5 file:font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] file:text-[0.54rem] file:uppercase file:tracking-[0.16em] file:text-stone-200 focus:border-white/35">
        </label>
        ${
          trip.coverImageURL || trip.coverImageStoragePath
            ? `
              <button type="button" data-action="remove-trip-cover" data-trip-id="${escapeHtml(trip.id)}" class="mt-3 block w-full border border-white/10 px-2 py-1.5 text-left font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.56rem] uppercase tracking-[0.16em] text-stone-200 transition hover:border-white/30 hover:bg-white/[0.06] hover:text-white">
                Remove Trip Image
              </button>
            `
            : ""
        }
        <div class="mt-3 border-t border-white/10 pt-3">
          <button type="button" data-action="delete-trip" data-trip-id="${escapeHtml(trip.id)}" class="block w-full border border-transparent px-2 py-1.5 text-left font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.56rem] uppercase tracking-[0.16em] text-stone-200 transition hover:border-red-300/35 hover:bg-red-300/10 hover:text-red-100">
            ${STRINGS.trips.deleteTrip}
          </button>
        </div>
      </div>
    </details>
  `;
}

function renderTripSection(trip, index, { view = "archive", profileFriend = null } = {}) {
  const isProfileView = view === "profile";
  const adminMode = !isProfileView && isAdminViewEnabled();
  const adminContextButtonClass = "shrink-0 border border-sky-300/32 bg-sky-100/[0.03] px-2.5 py-2 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.56rem] uppercase tracking-[0.14em] text-sky-100 transition hover:border-sky-200/55 hover:bg-sky-100/[0.08] disabled:cursor-not-allowed disabled:opacity-40 sm:px-3 sm:text-[0.62rem] sm:tracking-[0.18em]";
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
  const tripToggleIndicatorMarkup = isProfileView ? "" : renderTripToggleIndicator(expanded);
  const tripCoverMarkup = renderTripCoverMarkup(trip, expanded);
  const tripStatusTagMarkup = renderTripStatusTag(trip);
  const tripNotificationMarkup = !isProfileView
    ? renderNewMediaNotificationBadge(getNewMediaNotificationsForTrip(trip.id))
    : "";
  const tripSettingsMarkup = !isProfileView && adminMode ? renderTripSettingsMenu(trip) : "";
  const shellClass = isProfileView
    ? "border border-white/12 bg-[linear-gradient(to_bottom,rgba(38,38,38,0.18),rgba(255,255,255,0.02)_40%,rgba(0,0,0,0.1))]"
    : "border border-white/10 bg-white/[0.02]";
  const headerClass = isProfileView
    ? "relative flex flex-col gap-3 border-b border-white/10 bg-[linear-gradient(to_right,rgba(38,38,38,0.18),rgba(255,255,255,0.01)_46%,transparent)] px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5"
    : expanded
      ? "relative flex flex-col gap-3 border-b border-white/10 bg-[linear-gradient(to_right,rgba(38,38,38,0.08),rgba(255,255,255,0.008)_42%,transparent)] px-4 py-4 transition hover:bg-[linear-gradient(to_right,rgba(52,52,52,0.11),rgba(255,255,255,0.014)_42%,transparent)] sm:flex-row sm:items-end sm:justify-between sm:px-5"
      : "relative flex flex-col gap-3 border-b border-white/10 px-4 py-4 transition hover:bg-[linear-gradient(to_right,rgba(40,40,40,0.08),rgba(255,255,255,0.012)_42%,transparent)] sm:flex-row sm:items-end sm:justify-between sm:px-5";
  const contentClass = expanded
    ? "mobile-trip-open flex flex-col gap-4 p-0 lg:grid lg:gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:p-5"
    : "hidden flex-col gap-4 p-0 lg:gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:p-5";
  const folderRailClass = "min-w-0 border";
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
        responsiveClass: isProfileView
          ? "mobile-folder-open mt-3 min-w-0 lg:hidden"
          : "mobile-folder-open mt-3 min-w-0 overflow-hidden lg:hidden",
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
    : renderNoFolderSelectedPanel({
        isProfileView,
        responsiveClass: "hidden lg:block",
      });

  return `
    <section class="${shellClass} min-w-0 ${isProfileView ? "overflow-visible" : "overflow-hidden"}" data-trip-section="true">
      <div class="${headerClass} group${headerInteractiveClass}"${headerToggleAttributes}>
        ${tripCoverMarkup}
        ${tripToggleIndicatorMarkup}
        <div class="relative z-10 space-y-2">
          <p class="font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.72rem] uppercase tracking-[0.3em] ${isProfileView ? "text-stone-200/72" : "text-stone-300/55"}">${String(
            getTripSequenceNumber(trip, index)
          ).padStart(4, "0")}</p>
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="break-words text-2xl uppercase tracking-[0.18em] text-stone-100 [overflow-wrap:anywhere] sm:whitespace-nowrap sm:text-3xl">${escapeHtml(`${trip.slug}/`)}</h2>
            ${tripStatusTagMarkup}
            ${tripNotificationMarkup}
          </div>
          <p class="font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-xs uppercase tracking-[0.18em] ${isProfileView ? "text-stone-300/60" : "text-stone-300/60"}">${escapeHtml(trip.label)}</p>
        </div>
        <div class="relative z-10 min-w-0 w-full">
          <div class="flex w-full flex-wrap items-center justify-start gap-2 sm:justify-end sm:gap-3 sm:pr-1">
            ${
              isProfileView
                ? `<div class="shrink-0 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.62rem] uppercase tracking-[0.16em] text-stone-300/68 sm:text-[0.68rem] sm:tracking-[0.2em]">AUTHORED TRIP</div>`
                : ""
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
                `
                : ""
            }
            ${tripSettingsMarkup}
          </div>
        </div>
      </div>

      <div class="${contentClass}">
        <aside class="${folderRailClass} ${isProfileView ? "border-white/10 bg-black/30" : "border-white/10 bg-black/25"} p-2 sm:p-4">
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
      const notificationMarkup = view === "profile"
        ? ""
        : renderNewMediaNotificationBadge(
            getNewMediaNotificationsForFolder(trip.id, folder.id),
            { className: "whitespace-nowrap" }
          );
      const buttonStyle = highlightFolder
        ? getHighlightFolderButtonStyle(isSelected)
        : isSelected
          ? getFocusedFolderButtonStyle()
          : "";
      const shortLabel = buildFolderButtonLabel(trip, folder);
      const fullLabel = buildFolderPathLabel(trip, folder);
      const highlightTextStyle = highlightFolder && !isSelected ? getHighlightTextStyle() : "";
      const labelToneClass = isSelected ? " text-black" : "";
      const countToneClass = isSelected ? "text-black/70" : "text-stone-400/72";
      const labelStyleAttribute = highlightTextStyle ? ` style="${highlightTextStyle}"` : "";
      const countStyleAttribute = highlightTextStyle ? ` style="${highlightTextStyle}"` : "";
      const labelMarkup = `<span class="hidden lg:inline${labelToneClass}"${labelStyleAttribute}>${escapeHtml(shortLabel)}</span><span class="lg:hidden${labelToneClass}"${labelStyleAttribute}>${escapeHtml(fullLabel)}</span>`;
      const countMarkup = `<span class="flex shrink-0 items-center gap-1.5">${notificationMarkup}<span class="font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.62rem] tracking-[0.16em] ${countToneClass}"${countStyleAttribute}>${escapeHtml(String(folderItems.length))}</span></span>`;

      return `
        <button
          type="button"
          data-action="select-folder"
          data-view="${escapeHtml(view)}"
          data-trip-id="${escapeHtml(trip.id)}"
          data-folder-id="${escapeHtml(folder.id)}"
          class="flex w-full min-w-0 items-center justify-between gap-3 border px-3 py-3 text-left transition ${
            highlightFolder
              ? isSelected
                ? "folder-button-selected highlight-folder-button border-transparent text-black"
                : "highlight-folder-button border-transparent bg-[rgba(16,12,3,0.16)] text-stone-100"
              : isSelected
              ? "folder-button-selected border-stone-100 bg-stone-100 text-black"
              : "border-white/10 bg-black/20 text-stone-200 hover:-translate-y-px hover:border-white/32 hover:bg-white/[0.06] hover:text-white"
          }"${buttonStyle ? ` style="${buttonStyle}"` : ""}
        >
          <span class="min-w-0 flex-1 break-all text-sm uppercase tracking-[0.14em] [overflow-wrap:anywhere] lg:break-words">${labelMarkup}</span>
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

  return [...items].sort((left, right) => compareItems(left, right, sortMode, tripId, folderId));
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
  return total === 1 ? "1 UPLOAD" : `${total} UPLOADS`;
}

function buildRecentMediaViewKey(item, tripId, folderId) {
  const sourceFolderId = resolveItemSourceFolderId(item, folderId);
  return tripId && sourceFolderId && item?.id
    ? `${tripId}:${sourceFolderId}:${item.id}`
    : "";
}

function getRecentMediaViewTimestamp(item, tripId, folderId) {
  const key = buildRecentMediaViewKey(item, tripId, folderId);
  return key ? Number(recentMediaViews[key] || 0) : 0;
}

function isMediaItemViewedRecently(item, tripId, folderId) {
  const viewedAt = getRecentMediaViewTimestamp(item, tripId, folderId);
  return viewedAt > 0 && Date.now() - viewedAt <= RECENT_MEDIA_VIEW_WINDOW_MS;
}

function formatRecentMediaViewLabel(viewedAtMs) {
  const elapsedMs = Math.max(0, Date.now() - Number(viewedAtMs || 0));

  if (elapsedMs < 60 * 1000) {
    return "JUST NOW";
  }

  if (elapsedMs < 60 * 60 * 1000) {
    return `${Math.max(1, Math.round(elapsedMs / (60 * 1000)))}M AGO`;
  }

  return `${Math.max(1, Math.round(elapsedMs / (60 * 60 * 1000)))}H AGO`;
}

function renderRecentMediaViewMeta(item, tripId, folderId) {
  return renderRecentMediaViewMetaWithKey(item, tripId, folderId, "");
}

function renderRecentMediaViewMetaWithKey(item, tripId, folderId, mostRecentViewedKey = "") {
  const viewedAt = getRecentMediaViewTimestamp(item, tripId, folderId);
  const itemKey = buildRecentMediaViewKey(item, tripId, folderId);

  if (
    !viewedAt ||
    !itemKey ||
    itemKey !== mostRecentViewedKey ||
    !isMediaItemViewedRecently(item, tripId, folderId)
  ) {
    return "";
  }

  return `
    <div class="mt-1.5 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.54rem] uppercase tracking-[0.14em] text-stone-500/78">
      Most Recently Viewed // ${escapeHtml(formatRecentMediaViewLabel(viewedAt))}
    </div>
  `;
}

function getMostRecentVisibleMediaViewKey(items, tripId, folderId) {
  let mostRecentViewedKey = "";
  let mostRecentViewedAt = 0;

  items.forEach((item) => {
    const itemKey = buildRecentMediaViewKey(item, tripId, folderId);
    const viewedAt = itemKey ? Number(recentMediaViews[itemKey] || 0) : 0;

    if (
      itemKey &&
      viewedAt > mostRecentViewedAt &&
      isMediaItemViewedRecently(item, tripId, folderId)
    ) {
      mostRecentViewedKey = itemKey;
      mostRecentViewedAt = viewedAt;
    }
  });

  return mostRecentViewedKey;
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

function getItemTypeLabel(item) {
  return item.kind === "text"
    ? STRINGS.items.post
    : item.extension || simplifyMimeType(item.mimeType) || "FILE";
}

// Desktop/table item renderer. The profile page uses the same row structure as
// the main archive so horizontal overflow behavior stays consistent on mobile.
function renderItemRows(items, tripId, folderId, view = "archive", options = {}) {
  const showSourceColumn = Boolean(options.showSourceColumn);
  const mostRecentViewedKey = getMostRecentVisibleMediaViewKey(items, tripId, folderId);

  if (items.length === 0) {
    return `
      <tr class="text-stone-300/45 uppercase">
        <td class="align-middle border-b border-white/8 px-2 py-2.5">${STRINGS.items.noObjects}</td>
        ${showSourceColumn ? `<td class="align-middle border-b border-white/8 px-2 py-2.5">${STRINGS.items.emptyName}</td>` : ""}
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
      const viewedRecently = isMediaItemViewedRecently(item, tripId, folderId);
      const mutedTextClass = viewedRecently ? "text-stone-500/72" : "";
      const typeLabel = getItemTypeLabel(item);
      const sourceFolderId = resolveItemSourceFolderId(item, folderId);
      const preview = renderItemPreview(item, tripId, folderId, view, certifiedRow);
      const source = renderItemSource(tripId, sourceFolderId, { muted: viewedRecently });
      const author = renderItemAuthor(item, { muted: viewedRecently });
      const certified = renderItemCertified(item, { muted: viewedRecently });
      const notificationMarkup = renderNewMediaNotificationBadge(
        getNewMediaNotificationsForItem(item, tripId, sourceFolderId),
        { className: "mt-1.5" }
      );
      const meta = renderItemMeta(item, tripId, sourceFolderId, {
        mostRecentViewedKey,
        muted: viewedRecently,
      });
      const cellBorderClass = certifiedRow
        ? "border-b border-transparent"
        : "border-b border-white/8";
      const nameMarkup = renderItemNameMarkup(item, displayName, tripId, folderId, view);
      const previewRowSelected = Boolean(
        currentVideoPreviewContext &&
          currentVideoPreviewContext.view === view &&
          currentVideoPreviewContext.tripId === tripId &&
          currentVideoPreviewContext.folderId === folderId &&
          currentVideoPreviewContext.itemId === item.id
      );

      return `
        <tr
          data-preview-row="true"
          data-view="${escapeHtml(view)}"
          data-trip-id="${escapeHtml(tripId)}"
          data-folder-id="${escapeHtml(folderId)}"
          data-item-id="${escapeHtml(item.id)}"
          class="transition hover:bg-white/[0.03]${certifiedRow ? " bg-[rgba(255,221,138,0.028)]" : ""}${previewRowSelected ? " bg-white/[0.04]" : ""}${viewedRecently ? " text-stone-500/72" : ""}"
          ${certifiedRow ? ` style="${getCertifiedRowStyle()}"` : ""}
        >
          <td class="align-middle min-w-[4rem] ${cellBorderClass} px-2 py-2 sm:min-w-[4.5rem] sm:px-2.5 sm:py-2.5">${preview}</td>
          ${showSourceColumn ? `<td class="align-middle min-w-[7rem] ${cellBorderClass} px-2 py-2 uppercase ${viewedRecently ? mutedTextClass : "text-stone-200/82"} sm:min-w-[8rem] sm:px-2.5">${source}</td>` : ""}
          <td class="align-middle min-w-[11rem] ${cellBorderClass} px-2 py-2 sm:min-w-[12rem] sm:px-2.5"><div class="flex min-w-0 flex-col items-start">${nameMarkup}${notificationMarkup}</div></td>
          <td class="align-middle min-w-[5rem] ${cellBorderClass} px-2 py-2 uppercase ${viewedRecently ? mutedTextClass : "text-stone-300/72"} sm:min-w-[5.5rem] sm:px-2.5">${escapeHtml(
            typeLabel
          )}</td>
          <td class="align-middle min-w-[7rem] ${cellBorderClass} px-2 py-2 uppercase ${viewedRecently ? mutedTextClass : "text-stone-300/72"} sm:min-w-[7.5rem] sm:px-2.5">${author}</td>
          <td class="align-middle min-w-[8rem] ${cellBorderClass} px-2 py-2 uppercase ${viewedRecently ? mutedTextClass : "text-stone-300/72"} sm:min-w-[8.5rem] sm:px-2.5">${certified}</td>
          <td class="align-middle min-w-[12rem] ${cellBorderClass} px-2 py-2 uppercase ${viewedRecently ? mutedTextClass : "text-stone-300/72"} sm:min-w-[14rem] sm:px-2.5">${meta}</td>
        </tr>
      `;
    })
    .join("");
}

function renderMobileItemCards(items, tripId, folderId, view = "archive", options = {}) {
  const showSourceColumn = Boolean(options.showSourceColumn);
  const mostRecentViewedKey = getMostRecentVisibleMediaViewKey(items, tripId, folderId);

  if (items.length === 0) {
    return `
      <div class="border border-dashed border-white/10 bg-black/10 px-4 py-8 text-center font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.68rem] uppercase tracking-[0.18em] text-stone-300/48">
        ${STRINGS.items.noObjects}
      </div>
    `;
  }

  return `
    <div class="-mx-0.5 flex flex-col gap-1 sm:-mx-1">
      ${items
        .map((item) =>
          renderMobileItemCard(item, tripId, folderId, view, {
            showSourceColumn,
            mostRecentViewedKey,
          })
        )
        .join("")}
    </div>
  `;
}

// Mobile/card item renderer. File cards put the preview action on the outer
// article so tapping anywhere on a media card opens the preview, not just title.
function renderMobileItemCard(item, tripId, folderId, view = "archive", options = {}) {
  const displayName = getItemDisplayName(item);
  const certified = isItemCertified(item);
  const showSourceColumn = Boolean(options.showSourceColumn);
  const mostRecentViewedKey = String(options.mostRecentViewedKey || "");
  const sourceFolderId = resolveItemSourceFolderId(item, folderId);
  const viewedRecently = isMediaItemViewedRecently(item, tripId, folderId);
  const typeLabel = getItemTypeLabel(item);
  const previewRowSelected = Boolean(
    currentVideoPreviewContext &&
      currentVideoPreviewContext.view === view &&
      currentVideoPreviewContext.tripId === tripId &&
      currentVideoPreviewContext.folderId === folderId &&
      currentVideoPreviewContext.itemId === item.id
  );
  const sourceLabel = showSourceColumn ? buildItemSourceLabel(tripId, sourceFolderId) : "";
  const sourceMarkup = sourceLabel
    ? `<span class="font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.48rem] uppercase tracking-[0.12em] text-stone-500/72">${escapeHtml(
        sourceLabel
      )}</span>`
    : "";
  const notificationMarkup = renderNewMediaNotificationBadge(
    getNewMediaNotificationsForItem(item, tripId, sourceFolderId),
    { className: "mt-1" }
  );

  const authorMarkup = renderItemAuthor(item, { muted: viewedRecently });
  const sizeLabel = item.kind === "text" ? STRINGS.items.textPost : formatBytes(item.size);
  const secondaryToneClass = viewedRecently ? "text-stone-500/72" : "text-stone-300/72";
  const metaLineMarkup = `
    <div class="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.5rem] uppercase leading-tight tracking-[0.1em] ${secondaryToneClass}">
      ${authorMarkup}
      <span class="text-stone-500/62">/</span>
      <span>${escapeHtml(typeLabel)}</span>
      <span class="text-stone-500/62">/</span>
      <span>${escapeHtml(sizeLabel)}</span>
    </div>
  `;
  const descriptionMarkup =
    item.kind === "file" && item.description
      ? `<div class="mt-0.5 line-clamp-1 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.5rem] leading-3 text-stone-400/64">${escapeHtml(item.description)}</div>`
    : "";
  const recentViewMarkup =
    item.kind === "file"
      ? renderRecentMediaViewMetaWithKey(item, tripId, sourceFolderId, mostRecentViewedKey)
      : "";
  const interactionCounts =
    item.kind === "file"
      ? getMediaItemInteractionCounts(item, tripId, sourceFolderId)
      : null;
  const interactionMarkup = interactionCounts
    ? `
      <div class="mt-1 flex flex-wrap gap-1">
        ${renderSocialMetricBadge(interactionCounts.likeCount, "LIKE", certified ? "highlight" : "default")}
        ${renderSocialMetricBadge(interactionCounts.commentCount, "COMMENT", certified ? "highlight" : "default")}
      </div>
    `
    : "";
  const topLabelMarkup = certified
    ? `<span class="font-['Teko',sans-serif] text-[0.82rem] leading-none tracking-[0.16em]" style="${getHighlightTextStyle()}">${escapeHtml(
        HIGHLIGHT_FOLDER_LABEL
      )}</span>`
    : "";
  const actionMenuMarkup = renderItemActionMenu(item, tripId, sourceFolderId, {
    detailsClass: "relative shrink-0",
    summaryLabel: "Item actions",
  });
  const cardPreviewable = item.kind === "file" && isPreviewableMediaItem(item);
  const cardClass = [
    `relative overflow-visible border ${certified ? "border-amber-300/28 bg-[rgba(255,221,138,0.028)]" : "border-white/8 bg-black/10"} px-1.5 py-1.5 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.66rem] tracking-[0.06em] text-stone-200/85 transition hover:bg-white/[0.03]`,
    cardPreviewable ? "cursor-pointer" : "",
    previewRowSelected ? "bg-white/[0.04] ring-1 ring-white/12" : "",
    viewedRecently ? "text-stone-500/72" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <article
      ${cardPreviewable ? `data-action="preview-media-card"` : ""}
      data-preview-row="true"
      data-view="${escapeHtml(view)}"
      data-trip-id="${escapeHtml(tripId)}"
      data-folder-id="${escapeHtml(folderId)}"
      data-item-id="${escapeHtml(item.id)}"
      class="${cardClass}"
      ${certified ? ` style="${getCertifiedRowStyle()}"` : ""}
    >
      <div class="flex items-center gap-2">
        <div class="shrink-0">${renderItemPreview(item, tripId, folderId, view, certified)}</div>
        <div class="min-w-0 flex-1">
          <div class="flex min-w-0 items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              ${topLabelMarkup || sourceMarkup ? `<div class="mb-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">${topLabelMarkup}${sourceMarkup}</div>` : ""}
              ${renderMobileItemTitle(item, displayName, tripId, folderId, view, viewedRecently)}
              ${notificationMarkup}
              ${metaLineMarkup}
              ${descriptionMarkup}
              ${recentViewMarkup}
              ${interactionMarkup}
            </div>
            ${actionMenuMarkup}
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderMobileItemTitle(
  item,
  displayName,
  tripId,
  folderId,
  view = "archive",
  viewedRecently = false
) {
  const toneClass = viewedRecently
    ? "text-stone-500/72 hover:text-stone-300"
    : "text-stone-100 hover:text-white";
  const titleClass = `line-clamp-2 break-all font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.72rem] font-normal leading-[1.08] tracking-[0.04em] [overflow-wrap:anywhere] transition ${toneClass}`;

  if (item.kind === "text") {
    return `
      <button
        type="button"
        data-action="preview-text"
        data-view="${escapeHtml(view)}"
        data-trip-id="${escapeHtml(tripId)}"
        data-folder-id="${escapeHtml(folderId)}"
        data-item-id="${escapeHtml(item.id)}"
        class="block w-full bg-transparent p-0 text-left"
        aria-label="Preview ${escapeHtml(displayName)}"
      >
        <span class="${titleClass}">${escapeHtml(displayName)}</span>
      </button>
    `;
  }

  if (isPreviewableMediaItem(item)) {
    return `
      <button
        type="button"
        data-action="preview-media"
        data-view="${escapeHtml(view)}"
        data-trip-id="${escapeHtml(tripId)}"
        data-folder-id="${escapeHtml(folderId)}"
        data-item-id="${escapeHtml(item.id)}"
        class="block w-full bg-transparent p-0 text-left"
        aria-label="Preview ${escapeHtml(displayName)}"
      >
        <span class="${titleClass}">${escapeHtml(displayName)}</span>
      </button>
    `;
  }

  return `<a class="block ${titleClass}" href="${escapeHtml(item.downloadURL)}" target="_blank" rel="noreferrer">${escapeHtml(
    displayName
  )}</a>`;
}

function renderMobileItemPreview(item, tripId, folderId, view = "archive", certified = false) {
  const displayName = getItemDisplayName(item);
  const previewStyle = certified ? getHighlightButtonStyle() : "";
  const wrapperClass =
    "group relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden border border-black/14 bg-black/68 p-[3px] shadow-[0_10px_22px_rgba(0,0,0,0.24)] transition hover:opacity-95";
  const fallbackPanelClass =
    "relative flex h-full w-full items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#c00000_0%,#8e0000_100%)]";
  const mediaClass = "block h-full w-full object-cover";
  const playOverlay = `
    <span class="pointer-events-none absolute inset-0 flex items-center justify-center">
      <span class="flex h-8 w-8 items-center justify-center rounded-full border border-white/28 bg-black/62 text-[0.62rem] text-white/92">
        &#9654;
      </span>
    </span>
  `;

  if (item.kind === "text") {
    return `
      <button
        type="button"
        data-action="preview-text"
        data-view="${escapeHtml(view)}"
        data-trip-id="${escapeHtml(tripId)}"
        data-folder-id="${escapeHtml(folderId)}"
        data-item-id="${escapeHtml(item.id)}"
        class="${wrapperClass}"
        ${previewStyle ? `style="${previewStyle}"` : ""}
        aria-label="Preview ${escapeHtml(displayName)}"
      >
        <span class="${fallbackPanelClass}">
          <span class="font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.72rem] uppercase tracking-[0.18em] text-white/92">TXT</span>
        </span>
      </button>
    `;
  }

  if (isImagePreviewItem(item)) {
    return `
      <button
        type="button"
        data-action="preview-media"
        data-view="${escapeHtml(view)}"
        data-trip-id="${escapeHtml(tripId)}"
        data-folder-id="${escapeHtml(folderId)}"
        data-item-id="${escapeHtml(item.id)}"
        class="${wrapperClass}"
        ${previewStyle ? `style="${previewStyle}"` : ""}
        aria-label="Preview ${escapeHtml(displayName)}"
      >
        <img src="${escapeHtml(item.downloadURL)}" alt="${escapeHtml(displayName)}" class="${mediaClass}">
      </button>
    `;
  }

  if (isVideoPreviewItem(item)) {
    if (item.posterDownloadURL) {
      return `
        <button
          type="button"
          data-action="preview-media"
          data-view="${escapeHtml(view)}"
          data-trip-id="${escapeHtml(tripId)}"
          data-folder-id="${escapeHtml(folderId)}"
          data-item-id="${escapeHtml(item.id)}"
          class="${wrapperClass}"
          ${previewStyle ? `style="${previewStyle}"` : ""}
          aria-label="Preview ${escapeHtml(displayName)}"
        >
          <span class="relative block h-full w-full overflow-hidden">
            <img src="${escapeHtml(item.posterDownloadURL)}" alt="${escapeHtml(displayName)}" class="${mediaClass}">
            ${playOverlay}
          </span>
        </button>
      `;
    }

    return `
      <button
        type="button"
        data-action="preview-media"
        data-view="${escapeHtml(view)}"
        data-trip-id="${escapeHtml(tripId)}"
        data-folder-id="${escapeHtml(folderId)}"
        data-item-id="${escapeHtml(item.id)}"
        class="${wrapperClass}"
        ${previewStyle ? `style="${previewStyle}"` : ""}
        aria-label="Preview ${escapeHtml(displayName)}"
      >
        <span class="${fallbackPanelClass}">
          ${playOverlay}
        </span>
      </button>
    `;
  }

  return `
    <a
      class="${wrapperClass}"
      ${previewStyle ? `style="${previewStyle}"` : ""}
      href="${escapeHtml(item.downloadURL)}"
      target="_blank"
      rel="noreferrer"
      aria-label="Download ${escapeHtml(displayName)}"
    >
      <span class="${fallbackPanelClass}">
        <span class="px-2 text-center font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.62rem] uppercase tracking-[0.16em] text-white/92">${escapeHtml(
          getItemTypeLabel(item)
        )}</span>
      </span>
    </a>
  `;
}

function renderMobileItemAuthorMarkup(item, options = {}) {
  const authorLabel = resolveItemAuthorLabel(item);
  const authorRouteId = getItemAuthorRouteId(item);
  const muted = Boolean(options?.muted);

  if (!authorLabel) {
    return `<span class="${muted ? "text-black/42" : "text-white/76"}">${escapeHtml(STRINGS.items.emptyName)}</span>`;
  }

  if (!authorRouteId || isItemBrandAuthored(item)) {
    return `<span class="${muted ? "text-black/48" : "text-white/94"}">${escapeHtml(authorLabel)}</span>`;
  }

  return `<a class="${muted ? "text-black/50 hover:text-black/68" : "text-white/94 hover:text-white"} underline-offset-4 transition hover:underline" href="${escapeHtml(
    buildProfilePath(authorRouteId)
  )}">${escapeHtml(authorLabel)}</a>`;
}

function renderItemNameMarkup(item, displayName, tripId, folderId, view = "archive") {
  const viewedRecently = isMediaItemViewedRecently(item, tripId, folderId);
  const linkToneClass = viewedRecently
    ? "text-stone-500/72 hover:text-stone-200"
    : "text-stone-100 hover:text-white";

  if (item.kind === "text") {
    return `<div class="${viewedRecently ? "text-stone-500/72" : "text-stone-100"}">${escapeHtml(item.title || item.name)}</div>`;
  }

  if (isPreviewableMediaItem(item)) {
    return `
      <button
        type="button"
        data-action="preview-media"
        data-view="${escapeHtml(view)}"
        data-trip-id="${escapeHtml(tripId)}"
        data-folder-id="${escapeHtml(folderId)}"
        data-item-id="${escapeHtml(item.id)}"
        class="bg-transparent p-0 text-left underline-offset-4 transition hover:underline ${linkToneClass}"
        aria-label="Preview ${escapeHtml(displayName)}"
      >
        ${escapeHtml(displayName)}
      </button>
    `;
  }

  return `<a class="text-stone-100 underline-offset-4 hover:text-white hover:underline" href="${escapeHtml(
    item.downloadURL
  )}" target="_blank" rel="noreferrer">${escapeHtml(displayName)}</a>`;
}

function renderItemSource(tripId, folderId, options = {}) {
  const label = buildItemSourceLabel(tripId, folderId);
  const muted = Boolean(options?.muted);

  if (!label) {
    return `<span class="text-stone-300/40">${STRINGS.items.emptyName}</span>`;
  }

  return `<span class="${muted ? "text-stone-500/72" : "text-stone-100/86"}">${escapeHtml(label)}</span>`;
}

function renderItemCertified(item, options = {}) {
  if (!isItemCertified(item)) {
    return "";
  }

  if (options?.muted) {
    return `<span class="font-['Teko',sans-serif] text-[1.15rem] leading-none tracking-[0.18em] text-stone-500/72">${escapeHtml(HIGHLIGHT_FOLDER_LABEL)}</span>`;
  }

  return `<span class="font-['Teko',sans-serif] text-[1.15rem] leading-none tracking-[0.18em]" style="${getHighlightTextStyle()}">${escapeHtml(HIGHLIGHT_FOLDER_LABEL)}</span>`;
}

function renderItemActionMenu(item, tripId, folderId, options = {}) {
  const adminContext = isAdminViewEnabled();
  const neutralMenuButtonClass = getSocialMenuItemButtonClass();
  const accentDeleteButtonClass = getSocialMenuItemButtonClass("delete");
  const certifyMenuButtonClass = "block w-full border border-amber-200/35 bg-amber-100/[0.07] px-2 py-1.5 text-left font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.56rem] uppercase tracking-[0.16em] text-amber-50 transition hover:border-amber-100/55 hover:bg-amber-100/[0.12] disabled:cursor-not-allowed disabled:opacity-45";
  const uncertifyMenuButtonClass = "block w-full border border-sky-300/32 bg-sky-100/[0.03] px-2 py-1.5 text-left font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.56rem] uppercase tracking-[0.16em] text-sky-100 transition hover:border-sky-200/55 hover:bg-sky-100/[0.08] disabled:cursor-not-allowed disabled:opacity-45";
  const featuredMenuButtonClass = "block w-full border border-sky-300/24 bg-sky-100/[0.03] px-2 py-1.5 text-left font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.56rem] uppercase tracking-[0.16em] text-sky-100 transition hover:border-sky-200/55 hover:bg-sky-100/[0.08] disabled:cursor-not-allowed disabled:opacity-45";
  const detailsClass = options.detailsClass || "relative inline-block";
  const summaryClass =
    options.summaryClass ||
    "flex h-7 w-7 cursor-pointer list-none items-center justify-center border border-white/10 bg-black/40 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.68rem] leading-none tracking-[0.08em] text-stone-200 transition hover:border-white/30 hover:bg-white/[0.08] [&::-webkit-details-marker]:hidden";
  const menuClass =
    options.menuClass ||
    "absolute right-0 top-[calc(100%+0.35rem)] z-30 w-44 border border-white/12 bg-neutral-950/98 p-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.45)]";
  const summaryLabel = options.summaryLabel || "Clip actions";
  const summaryText = options.summaryText || "...";
  const actionButtons = [];

  if (adminContext && item.kind === "file") {
    actionButtons.push(`
      <button
        type="button"
        data-action="toggle-certified"
        data-trip-id="${escapeHtml(tripId)}"
        data-folder-id="${escapeHtml(folderId)}"
        data-item-id="${escapeHtml(item.id)}"
        class="${isItemCertified(item) ? uncertifyMenuButtonClass : certifyMenuButtonClass}"
      >
        ${isItemCertified(item) ? "Uncertify" : "Certify"}
      </button>
    `);
  }

  if (adminContext && item.kind === "file" && isVideoPreviewItem(item)) {
    actionButtons.push(`
      <button
        type="button"
        data-action="toggle-featured-clip"
        data-trip-id="${escapeHtml(tripId)}"
        data-folder-id="${escapeHtml(folderId)}"
        data-item-id="${escapeHtml(item.id)}"
        class="${featuredMenuButtonClass}"
      >
        ${isFeaturedClipItem(item, tripId, folderId) ? "Clear Featured Clip" : "Set Featured Clip"}
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
        class="${neutralMenuButtonClass}"
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
        class="${neutralMenuButtonClass}"
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
        class="${accentDeleteButtonClass}"
      >
        ${STRINGS.items.delete}
      </button>
    `);
  }

  if (actionButtons.length === 0) {
    return "";
  }

  return `
    <details class="${detailsClass}">
      <summary class="${summaryClass}" aria-label="${escapeHtml(summaryLabel)}">
        ${escapeHtml(summaryText)}
      </summary>
      <div class="${menuClass}">
        ${actionButtons.join("")}
      </div>
    </details>
  `;
}

function renderItemMeta(item, tripId, folderId, options = {}) {
  const summary =
    item.kind === "text"
      ? STRINGS.items.textPost
      : `${formatBytes(item.size)} / ${escapeHtml(getItemDisplayName(item))}`;
  const muted = Boolean(options?.muted);
  const descriptionMarkup =
    item.kind === "file" && item.description
      ? `<div class="mt-1.5 normal-case text-[0.58rem] leading-4 tracking-[0.04em] ${muted ? "text-stone-500/72" : "text-stone-300/72"}">${escapeHtml(
          item.description
        )}</div>`
      : "";
  const interactionCounts = item.kind === "file"
    ? getMediaItemInteractionCounts(item, tripId, folderId)
    : null;
  const interactionMarkup = interactionCounts
    ? `
      <div class="mt-1.5 flex flex-wrap gap-1.5">
        ${renderSocialMetricBadge(interactionCounts.likeCount, "LIKE")}
        ${renderSocialMetricBadge(interactionCounts.commentCount, "COMMENT")}
      </div>
    `
    : "";
  const mostRecentViewedKey = String(options?.mostRecentViewedKey || "");
  const recentViewMarkup = item.kind === "file"
    ? renderRecentMediaViewMetaWithKey(item, tripId, folderId, mostRecentViewedKey)
    : "";
  const actionMenuMarkup = renderItemActionMenu(item, tripId, folderId);
  const actionsMarkup = actionMenuMarkup ? `<div class="mt-2">${actionMenuMarkup}</div>` : "";

  const summaryMarkup = muted
    ? `<span class="text-stone-500/72">${summary}</span>`
    : summary;

  return `${summaryMarkup}${descriptionMarkup}${recentViewMarkup}${interactionMarkup}${actionsMarkup}`;
}

function renderItemPreview(item, tripId, folderId, view = "archive", certified = false) {
  const displayName = getItemDisplayName(item);
  const previewBorderClass = certified ? "border-transparent" : "border-white/20";
  const previewRingClass = certified ? "ring-1 ring-amber-200/35" : "ring-1 ring-white/18";
  const previewPanelClass = certified
    ? "bg-[linear-gradient(to_bottom,rgba(78,56,12,0.52),rgba(22,15,5,0.38))]"
    : "bg-[linear-gradient(to_bottom,rgba(255,255,255,0.1),rgba(255,255,255,0.03))]";
  const previewStyle = certified ? getHighlightButtonStyle(true) : "";

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
        ${previewStyle ? `style="${previewStyle}"` : ""}
        aria-label="Preview ${escapeHtml(displayName)}"
      >
        <span class="font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.48rem] uppercase tracking-[0.08em] text-stone-100">TXT</span>
        <span class="line-clamp-1 text-[0.42rem] uppercase tracking-[0.04em] text-stone-300/72 group-hover:text-stone-200">${escapeHtml(displayName)}</span>
      </button>
    `;
  }

  if (item.mimeType.startsWith("image/")) {
    return `
      <button
        type="button"
        data-action="preview-media"
        data-view="${escapeHtml(view)}"
        data-trip-id="${escapeHtml(tripId)}"
        data-folder-id="${escapeHtml(folderId)}"
        data-item-id="${escapeHtml(item.id)}"
        class="group relative inline-block border ${previewBorderClass} ${previewPanelClass} p-[1px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.025)] transition hover:opacity-90"
        ${previewStyle ? `style="${previewStyle}"` : ""}
        aria-label="Preview ${escapeHtml(displayName)}"
      >
        <img src="${escapeHtml(item.downloadURL)}" alt="${escapeHtml(
      displayName
    )}" class="h-11 w-[3.35rem] object-cover ${previewRingClass} sm:h-12 sm:w-[3.6rem]">
      </button>
    `;
  }

  if (item.mimeType.startsWith("video/")) {
    if (item.posterDownloadURL) {
      return `
        <button
          type="button"
          data-action="preview-media"
          data-view="${escapeHtml(view)}"
          data-trip-id="${escapeHtml(tripId)}"
          data-folder-id="${escapeHtml(folderId)}"
          data-item-id="${escapeHtml(item.id)}"
          class="group relative inline-block border ${previewBorderClass} ${previewPanelClass} p-[1px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.025)] transition hover:opacity-90"
          ${previewStyle ? `style="${previewStyle}"` : ""}
          aria-label="Preview ${escapeHtml(displayName)}"
        >
          <img src="${escapeHtml(item.posterDownloadURL)}" alt="${escapeHtml(
        displayName
      )}" class="block h-11 w-[3.35rem] overflow-hidden object-cover ${previewRingClass} sm:h-12 sm:w-[3.6rem]">
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
        data-action="preview-media"
        data-view="${escapeHtml(view)}"
        data-trip-id="${escapeHtml(tripId)}"
        data-folder-id="${escapeHtml(folderId)}"
        data-item-id="${escapeHtml(item.id)}"
        class="inline-flex h-11 w-[3.35rem] items-center justify-center border ${previewBorderClass} ${certified ? "bg-[rgba(62,46,12,0.44)]" : "bg-[rgba(255,255,255,0.08)]"} text-[0.52rem] uppercase tracking-[0.06em] text-stone-300/72 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.025)] transition hover:border-white/25 hover:text-stone-100 sm:h-12 sm:w-[3.6rem] sm:text-[0.58rem]"
        ${previewStyle ? `style="${previewStyle}"` : ""}
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

function renderItemAuthor(item, options = {}) {
  const authorLabel = resolveItemAuthorLabel(item);
  const authorRouteId = getItemAuthorRouteId(item);
  const muted = Boolean(options?.muted);

  if (!authorLabel) {
    return `<span class="text-stone-300/40">${STRINGS.items.emptyName}</span>`;
  }

  if (!authorRouteId || isItemBrandAuthored(item)) {
    return `<span class="${muted ? "text-stone-500/72" : "text-stone-200/82"}">${escapeHtml(authorLabel)}</span>`;
  }

  return `<a class="${muted ? "text-stone-500/72 hover:text-stone-400" : "text-stone-100/82 hover:text-white"} underline-offset-4 hover:underline" href="${escapeHtml(
    buildProfilePath(authorRouteId)
  )}">${escapeHtml(authorLabel)}</a>`;
}

// -----------------------------------------------------------------------------
// Folder Selection, Sorting, And Local UI Caches
// -----------------------------------------------------------------------------
// These helpers manage per-view folder selection, loaded item caches, upload job
// status, item sorting, and the small style variants used by highlighted rows.
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
  const onlineMembers = getOnlineMembers(visibleMembers);
  const authoredCounts = new Map(
    visibleMembers.map((friend) => [friend.uid || friend.id, countAuthoredItemsForUser(friend)])
  );
  const countLabel = padCount(visibleMembers.length, STRINGS.members.countLabel);
  const mobileCountLabel = formatPlainMemberCount(visibleMembers.length);
  const onlineLabel = formatOnlineMemberCount(onlineMembers.length);
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
    friendsMobileCount.textContent = mobileCountLabel;
  }

  if (friendsMobileInlineCount) {
    friendsMobileInlineCount.textContent = mobileCountLabel;
  }

  if (friendsDesktopStatus) {
    friendsDesktopStatus.textContent = statusText;
    friendsDesktopStatus.classList.toggle("hidden", !statusText);
  }

  if (friendsMobileStatus) {
    friendsMobileStatus.textContent = statusText || onlineLabel;
    friendsMobileStatus.classList.toggle("hidden", !(statusText || onlineLabel));
    friendsMobileStatus.classList.toggle("text-emerald-300/86", !statusText);
  }

  if (friendsMobileInlineStatus) {
    friendsMobileInlineStatus.textContent = statusText || onlineLabel;
    friendsMobileInlineStatus.classList.toggle("hidden", !(statusText || onlineLabel));
    friendsMobileInlineStatus.classList.toggle("text-emerald-300/86", !statusText);
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
  const membersRouteLinkMarkup = signedIn
    ? `
      <a href="/members" class="block border border-white/10 bg-white/[0.03] px-3 py-3 text-center font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.62rem] uppercase tracking-[0.2em] text-stone-200 transition hover:border-white/30 hover:bg-white/[0.08]">
        All Members
      </a>
    `
    : "";
  const panelMarkup = `${markup}${membersRouteLinkMarkup}`;

  if (friendsDesktopList) {
    friendsDesktopList.innerHTML = panelMarkup;
  }

  if (friendsMobileList) {
    friendsMobileList.innerHTML = panelMarkup;
  }

  if (friendsMobileInlineList) {
    friendsMobileInlineList.innerHTML = panelMarkup;
  }

  if (friendsMobileInlineShell) {
    friendsMobileInlineShell.classList.add("hidden");
  }

  renderMobileProfileMenu(visibleMembers, onlineMembers);
}

function renderMobileProfileMenu(visibleMembers = getVisibleMembers(), onlineMembers = getOnlineMembers(visibleMembers)) {
  const signedIn = Boolean(currentUser?.uid);
  const hasArchiveAccess = canUploadMedia();
  const routeButtons = [
    mobileMenuArchiveButton,
    mobileMenuProfileButton,
    mobileMenuActivityButton,
  ];
  const actionButtons = [
    mobileMenuSignOutButton,
  ];

  routeButtons.forEach((button) => {
    setElementVisible(button, signedIn && hasArchiveAccess, "block");
  });
  actionButtons.forEach((button) => {
    setElementVisible(button, signedIn, "block");
  });
  setElementVisible(mobileMenuSignInButton, false, "block");

if (mobileMenuMemberSummary) {
  const onlineMarkup = onlineMembers.length > 0
    ? onlineMembers
        .map((friend) => {
          const label = getFriendLabel(friend);
          const profileHref = friend.routeId ? buildProfilePath(friend.routeId) : "";

        const imageUrl = String(
  friend.photoURL ||
  friend.profileImageUrl ||
  friend.profileImage ||
  DEFAULT_PROFILE_IMAGE_URL
).trim() || DEFAULT_PROFILE_IMAGE_URL;

return profileHref
  ? `
    <a
      href="${escapeHtml(profileHref)}"
      class="flex items-center gap-2 border border-white/8 bg-black/20 px-2 py-2 transition hover:border-white/20 hover:bg-white/[0.06]"
      data-mobile-menu-profile-link="true"
    >
      <img
        src="${escapeHtml(imageUrl)}"
        alt=""
        class="h-7 w-7 shrink-0 border border-white/12 object-cover"
        loading="lazy"
      >
      <span class="h-2 w-2 shrink-0 border border-emerald-200/50 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.45)]"></span>
      <span class="min-w-0 break-words text-[0.6rem] text-stone-100 [overflow-wrap:anywhere]">
        ${escapeHtml(label)}
      </span>
    </a>
  `
  : `
    <div class="flex items-center gap-2 border border-white/8 bg-black/20 px-2 py-2 opacity-60">
      <img
        src="${escapeHtml(imageUrl)}"
        alt=""
        class="h-7 w-7 shrink-0 border border-white/12 object-cover"
        loading="lazy"
      >
      <span class="h-2 w-2 shrink-0 border border-emerald-200/50 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.45)]"></span>
      <span class="min-w-0 break-words text-[0.6rem] text-stone-100 [overflow-wrap:anywhere]">
        ${escapeHtml(label)}
      </span>
    </div>
  `;
        })
        .join("")
    : `<p class="text-[0.58rem] text-stone-500/80">NO MEMBERS ONLINE.</p>`;

  mobileMenuMemberSummary.innerHTML = signedIn
    ? `
        <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-[0.62rem]">
          <span class="flex flex-col text-left leading-5">
            <span>${escapeHtml(formatPlainMemberCount(visibleMembers.length))}</span>
            <span class="text-emerald-300/86">${escapeHtml(formatOnlineMemberCount(onlineMembers.length))}</span>
          </span>
          <span class="text-stone-500/80">▾</span>
        </summary>

        <div class="border-t border-white/10 px-3 py-3">
          <div class="space-y-2">
            ${onlineMarkup}
          </div>

          <button
            id="mobile-menu-all-members-button"
            type="button"
            class="mt-3 w-full border border-white/12 bg-white/[0.03] px-3 py-2 text-left text-[0.62rem] uppercase tracking-[0.2em] text-stone-100 transition hover:border-white/30 hover:bg-white/[0.08]"
          >
            View All Members
          </button>
        </div>
      `
    : "";

  mobileMenuMemberSummary.classList.toggle("hidden", !signedIn);
}

  syncMobileMenuRouteButtonStates();
}

function syncMobileMenuRouteButtonStates() {
  syncMobileMenuRouteButtonState(
    mobileMenuArchiveButton,
    currentRoute?.kind === ROUTE_ARCHIVE
  );
  syncMobileMenuRouteButtonState(
    mobileMenuProfileButton,
    isProfileRoute()
  );
  syncMobileMenuRouteButtonState(
    mobileMenuActivityButton,
    isFeedRoute()
  );
}

function syncMobileMenuRouteButtonState(button, active = false) {
  if (!button) {
    return;
  }

  MOBILE_MENU_ROUTE_BUTTON_ACTIVE_CLASSES.forEach((className) => {
    button.classList.toggle(className, Boolean(active));
  });
  MOBILE_MENU_ROUTE_BUTTON_INACTIVE_CLASSES.forEach((className) => {
    button.classList.toggle(className, !active);
  });

  if (active) {
    button.setAttribute("aria-current", "page");
    return;
  }

  button.removeAttribute("aria-current");
}

function syncMobileMenuToggleContent() {
  if (!mobileMenuToggle) {
    return;
  }

  const profileImageUrl = currentUser?.uid
    ? getFriendPhotoUrl(currentUserProfile || { photoURL: currentUser.photoURL || "" })
    : DEFAULT_PROFILE_IMAGE_URL;
  const label = currentUser?.uid ? "Open Profile Menu" : STRINGS.auth.openMenu;

  mobileMenuToggle.setAttribute("aria-label", label);
  mobileMenuToggle.setAttribute("title", label);
  mobileMenuToggle.classList.add("overflow-hidden");
  mobileMenuToggle.innerHTML = `
    <span class="sr-only">${escapeHtml(label)}</span>
    <img src="${escapeHtml(profileImageUrl)}" alt="" class="h-full w-full object-cover object-center">
  `;
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

  selectionMap.set(selectionKey, "");
  return "";
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
          aggregatedItems.push({
            ...item,
            sourceFolderId,
            folderId: sourceFolderId,
          });
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
  return [...items].sort((left, right) => compareItems(left, right, sortMode, tripId, folderId));
}

function renderItemSortOptions(selectedMode) {
  return [
    [ITEM_SORT_MEDIA_DATE_DESC, STRINGS.items.sortMediaDateDesc],
    [ITEM_SORT_MEDIA_DATE_ASC, STRINGS.items.sortMediaDateAsc],
    [ITEM_SORT_RECENTLY_ADDED, STRINGS.items.sortRecentlyAdded],
    [ITEM_SORT_MOST_LIKES, STRINGS.items.sortMostLikes],
    [ITEM_SORT_MOST_COMMENTS, STRINGS.items.sortMostComments],
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
    ITEM_SORT_MOST_LIKES,
    ITEM_SORT_MOST_COMMENTS,
  ].includes(value)
    ? value
    : ITEM_SORT_MEDIA_DATE_ASC;
}

function compareItems(left, right, sortMode, tripId = "", folderId = "") {
  const sequenceComparison = compareSequenceNamedItems(left, right, sortMode);
  if (sequenceComparison !== null) {
    return sequenceComparison;
  }

  if (sortMode === ITEM_SORT_MOST_LIKES) {
    return compareDescending(
      getSortableMediaLikeCount(left, tripId, folderId),
      getSortableMediaLikeCount(right, tripId, folderId),
      left,
      right
    );
  }

  if (sortMode === ITEM_SORT_MOST_COMMENTS) {
    return compareDescending(
      getSortableMediaCommentCount(left, tripId, folderId),
      getSortableMediaCommentCount(right, tripId, folderId),
      left,
      right
    );
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
    ![ITEM_SORT_MEDIA_DATE_ASC, ITEM_SORT_MEDIA_DATE_DESC].includes(sortMode) ||
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

function getSortableMediaLikeCount(item, tripId, folderId) {
  if (item?.kind !== "file") {
    return 0;
  }

  return getMediaItemInteractionCounts(item, tripId, folderId).likeCount;
}

function getSortableMediaCommentCount(item, tripId, folderId) {
  if (item?.kind !== "file") {
    return 0;
  }

  return getMediaItemInteractionCounts(item, tripId, folderId).commentCount;
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
    ? HIGHLIGHT_FOLDER_DISPLAY_LABEL
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

function getFocusedFolderButtonStyle() {
  return "box-shadow:inset 0 0 0 3px rgba(0,0,0,0.86),inset 0 0 0 3px rgba(255,255,255,0.16),0 0 18px rgba(255,255,255,0.1);";
}

function getHighlightFolderButtonStyle(isSelected = false) {
  if (!isSelected) {
    return getHighlightButtonStyle(false);
  }

  return "border-color:transparent;background-image:linear-gradient(135deg,#fff8cb 0%,#ffe57c 32%,#ffc93a 66%,#b77800 100%),linear-gradient(135deg,#fff7be 0%,#ffe063 34%,#ffc021 68%,#7f5000 100%);background-origin:border-box;background-clip:padding-box,border-box;box-shadow:inset 0 0 0 3px rgba(0,0,0,0.86),inset 0 0 0 3px rgba(255,248,203,0.22),0 0 22px rgba(255,199,58,0.18);";
}

function getHighlightPanelStyle() {
  return "border-color:transparent;background-image:linear-gradient(rgba(9,9,9,0.972),rgba(5,5,5,0.962)),linear-gradient(135deg,rgba(233,211,132,0.58) 0%,rgba(198,151,55,0.56) 48%,rgba(122,86,18,0.66) 100%);background-origin:border-box;background-clip:padding-box,border-box;box-shadow:inset 0 0 0 1px rgba(255,225,122,0.022),0 0 12px rgba(255,191,31,0.025);";
}

function getCertifiedRowStyle() {
  return "background-color:rgba(255,221,138,0.028);";
}

function isItemCertified(item) {
  return Boolean(item?.certified);
}

function resolveItemSourceFolderId(item, fallbackFolderId = "") {
  return String(item?.sourceFolderId || item?.folderId || fallbackFolderId || "");
}

function buildItemSourceLabel(tripId, folderId) {
  const trip = trips.find((item) => item.id === tripId);
  const folder = getFoldersForTrip(tripId).find((item) => item.id === folderId);

  if (!trip || !folder || isHighlightFolder(folder)) {
    return "";
  }

  return `${String(trip.slug || trip.id || "").toUpperCase()}/${getFolderDisplaySlug(folder).toUpperCase()}`;
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

// -----------------------------------------------------------------------------
// Firestore Data Normalizers
// -----------------------------------------------------------------------------
// Snapshot data is normalized at the boundary so render code can assume stable
// fields for trips, folders, media/text items, friends, and liked arrays.
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
    coverImageURL: String(trip?.coverImageURL || ""),
    coverImageStoragePath: String(trip?.coverImageStoragePath || ""),
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
    likeCount: Number(item?.likeCount || 0),
    commentCount: Number(item?.commentCount || 0),
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
    sourceFolderId: String(item?.sourceFolderId || item?.folderId || ""),
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
    likedMedia: Array.isArray(user?.likedMedia) ? user.likedMedia.map(String) : [],
    likedComments: Array.isArray(user?.likedComments) ? user.likedComments.map(String) : [],
    lastActiveAtMs: coerceTimestampToMs(user?.lastActiveAt, user?.lastActiveAtMs),
  };
}

function normalizeAuthorAliasMode(value) {
  return value === AUTHOR_ALIAS_BRAND ? AUTHOR_ALIAS_BRAND : AUTHOR_ALIAS_SELF;
}

// -----------------------------------------------------------------------------
// Member, Role, And Permission Helpers
// -----------------------------------------------------------------------------
// These helpers decide labels, profile routes, online status, admin visibility,
// and upload permissions used by both renderers and event guards.
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
  const online = isFriendOnline(friend);
  const onlineDotMarkup = online
    ? `<span class="h-2.5 w-2.5 shrink-0 border border-emerald-200/50 bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.45)]" title="Online" aria-label="Online"></span>`
    : "";
  const nameMarkup = profileHref
    ? `<a href="${escapeHtml(profileHref)}" class="min-w-0 break-words text-sm uppercase tracking-[0.14em] text-stone-100 transition hover:text-white [overflow-wrap:anywhere] xl:text-[0.78rem] xl:tracking-[0.12em] min-[1920px]:text-sm min-[1920px]:tracking-[0.14em]">${escapeHtml(label)}</a>`
    : `<p class="min-w-0 break-words text-sm uppercase tracking-[0.14em] text-stone-100 [overflow-wrap:anywhere] xl:text-[0.78rem] xl:tracking-[0.12em] min-[1920px]:text-sm min-[1920px]:tracking-[0.14em]">${escapeHtml(label)}</p>`;
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
  const sideRoleMarkup = `<div class="w-full shrink-0 sm:w-auto xl:hidden min-[1920px]:block">${roleMarkup}</div>`;
  const inlineCurrentUserMarkup = `<div class="xl:hidden min-[1920px]:block">${currentUserMarkup}</div>`;
  const cardInteractivityClass = profileHref
    ? "cursor-pointer transition-[border-color,background-color,transform] duration-200 hover:border-white/22 hover:bg-white/[0.03] focus:outline-none focus:ring-1 focus:ring-white/18"
    : "";
  const cardAttributes = profileHref
    ? `data-profile-href="${escapeHtml(profileHref)}" role="link" tabindex="0" aria-label="Open ${escapeHtml(label)} profile"`
    : "";

  return `
    <article ${cardAttributes} class="overflow-hidden border border-white/10 bg-black/20 px-3 py-3 xl:px-2.5 xl:py-2.5 min-[1920px]:px-3 min-[1920px]:py-3 ${cardInteractivityClass}">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start xl:gap-2 min-[1920px]:gap-3">
        <div class="flex min-w-0 items-start gap-3 xl:gap-2 min-[1920px]:gap-3">
          <img src="${escapeHtml(getFriendPhotoUrl(friend))}" alt="${escapeHtml(label)}" class="h-12 w-12 shrink-0 border border-white/10 bg-black object-cover object-center xl:h-9 xl:w-9 min-[1920px]:h-12 min-[1920px]:w-12">
          <div class="min-w-0 flex-1 space-y-2 xl:space-y-1.5 min-[1920px]:space-y-2">
            <div class="flex min-w-0 flex-wrap items-center gap-2">
              ${onlineDotMarkup}
              ${nameMarkup}
              ${inlineCurrentUserMarkup}
            </div>
            <p class="break-words font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.62rem] uppercase tracking-[0.18em] text-stone-400/74 [overflow-wrap:anywhere]">${escapeHtml(metaLabel)}</p>
            ${stackedMetaMarkup}
          </div>
        </div>
        ${sideRoleMarkup}
      </div>
    </article>
  `;
}

function renderFriendControls(friend, canDeleteProfile) {
  return `
    <div class="flex w-full flex-col items-start gap-2 sm:w-auto xl:gap-1.5 min-[1920px]:gap-2">
      ${renderRoleSelect(friend)}
      ${
        canDeleteProfile
          ? `
              <button
                type="button"
                data-action="delete-profile"
                data-user-id="${escapeHtml(friend.uid || friend.id)}"
                class="w-full border border-sky-300/32 bg-sky-100/[0.03] px-2 py-1 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.58rem] uppercase tracking-[0.18em] text-sky-100 transition hover:border-sky-200/55 hover:bg-sky-100/[0.08] sm:w-auto xl:px-1.5 xl:py-0.5 xl:text-[0.52rem] min-[1920px]:px-2 min-[1920px]:py-1 min-[1920px]:text-[0.58rem]"
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
      class="w-full border border-sky-300/28 bg-sky-100/[0.04] px-2 py-2 font-['Cascadia_Mono','JetBrains_Mono',Consolas,monospace] text-[0.58rem] uppercase tracking-[0.18em] text-sky-100 outline-none transition focus:border-sky-200/55 sm:w-auto xl:px-1.5 xl:py-1.5 xl:text-[0.52rem] min-[1920px]:px-2 min-[1920px]:py-2 min-[1920px]:text-[0.58rem]"
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

function isFriendOnline(friend) {
  const lastActiveAtMs = Number(friend?.lastActiveAtMs || 0);
  return lastActiveAtMs > 0 && Date.now() - lastActiveAtMs <= ONLINE_WINDOW_MS;
}

function getOnlineMembers(members = getVisibleMembers()) {
  return members.filter(isFriendOnline);
}

function formatPlainMemberCount(count) {
  const total = Number(count || 0);
  return `${total} ${total === 1 ? "MEMBER" : "MEMBERS"}`;
}

function formatOnlineMemberCount(count) {
  const total = Number(count || 0);
  return `${total} ONLINE`;
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
        label: HIGHLIGHT_FOLDER_DISPLAY_LABEL,
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

function buildDefaultUploadDisplayName(file, index, trip = null, existingMediaCount = 0) {
  const tripSlug = slugifyTrip(trip?.slug || trip?.id || "trip");
  const mediaPrefix = isVideoFile(file) ? "V" : "P";
  const extension =
    getFileExtension(file?.name) ||
    (isVideoFile(file) ? "mp4" : "jpg");
  const sequenceIndex = Math.max(0, Number(existingMediaCount || 0) + Number(index || 0));
  const baseName = `${tripSlug}-${mediaPrefix}${sequenceIndex}`;

  return extension ? `${baseName}.${extension}` : baseName;
}

// -----------------------------------------------------------------------------
// Featured Clip, Recent Views, And Friendly Errors
// -----------------------------------------------------------------------------
// Final UI polish helpers: archive hero content, local viewed-media persistence,
// logo motion, and user-facing Firebase/Auth/Storage error copy.
function renderFeaturedMessage() {
  if (!loadingText) {
    return;
  }

  loadingText.textContent = `> ${normalizeFeaturedMessage(featuredMessage)}`;
}

function renderFeaturedClip() {
  const featuredEntry = resolveFeaturedClipEntry();
  const shouldShow = Boolean(featuredEntry && currentRoute?.kind === ROUTE_ARCHIVE && canUploadMedia());

  if (featuredClipShell) {
    featuredClipShell.classList.toggle("hidden", !shouldShow);
  }

  if (!featuredEntry) {
    if (featuredClipImage) {
      featuredClipImage.removeAttribute("src");
      featuredClipImage.alt = "";
    }

    if (featuredClipTitle) {
      featuredClipTitle.textContent = "";
    }

    if (featuredClipContext) {
      featuredClipContext.textContent = "";
    }

    if (featuredClipDescription) {
      featuredClipDescription.textContent = "";
    }

    return;
  }

  const { trip, folder, item } = featuredEntry;
  const previewImageUrl = item.posterDownloadURL || item.downloadURL || "";
  const contextLabel = buildFolderPathLabel(trip, folder).replace(/\/$/, "").toUpperCase();

  if (featuredClipImage) {
    featuredClipImage.src = previewImageUrl;
    featuredClipImage.alt = getItemDisplayName(item);
  }

  if (featuredClipTitle) {
    featuredClipTitle.textContent = getItemDisplayName(item);
  }

  if (featuredClipContext) {
    featuredClipContext.textContent = `UP FRONT // ${contextLabel}`;
  }

  if (featuredClipDescription) {
    featuredClipDescription.textContent = item.description || "";
  }
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

function normalizeFeaturedClip(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const tripId = String(value.tripId || "");
  const folderId = String(value.folderId || "");
  const itemId = String(value.itemId || "");

  if (!tripId || !folderId || !itemId) {
    return null;
  }

  return { tripId, folderId, itemId };
}

function resolveFeaturedClipEntry() {
  if (!featuredClip?.tripId || !featuredClip?.folderId || !featuredClip?.itemId) {
    return null;
  }

  const trip = trips.find((entry) => entry.id === featuredClip.tripId) || null;
  const folder = getFoldersForTrip(featuredClip.tripId).find((entry) => entry.id === featuredClip.folderId) || null;
  const item = getItemsForFolder(featuredClip.tripId, featuredClip.folderId).find((entry) => entry.id === featuredClip.itemId) || null;

  if (!trip || !folder || !item || !isPreviewableMediaItem(item)) {
    return null;
  }

  return { trip, folder, item };
}

function isFeaturedClipItem(item, tripId, folderId) {
  const sourceFolderId = resolveItemSourceFolderId(item, folderId);
  return Boolean(
    featuredClip &&
      featuredClip.tripId === tripId &&
      featuredClip.folderId === sourceFolderId &&
      featuredClip.itemId === item?.id
  );
}

function handleFeaturedClipOpenClick() {
  const featuredEntry = resolveFeaturedClipEntry();

  if (!featuredEntry) {
    return;
  }

  openVideoPreview(featuredEntry.trip.id, featuredEntry.folder.id, featuredEntry.item.id, "archive", {
    preservePageContext: true,
    restoreScrollY: window.scrollY,
  });
}

function handleFeaturedClipShellClick(event) {
  if (
    event.target.closest("#featured-clip-open-button") ||
    event.target.closest("a[href], button, input, textarea, select, label, summary, details, form")
  ) {
    return;
  }

  handleFeaturedClipOpenClick();
}

function loadRecentMediaViews() {
  try {
    const rawValue = window.localStorage.getItem(RECENT_MEDIA_VIEW_STORAGE_KEY);

    if (!rawValue) {
      return {};
    }

    const parsed = JSON.parse(rawValue);
    return pruneRecentMediaViews(parsed);
  } catch {
    return {};
  }
}

function persistRecentMediaViews(value) {
  try {
    window.localStorage.setItem(
      RECENT_MEDIA_VIEW_STORAGE_KEY,
      JSON.stringify(pruneRecentMediaViews(value))
    );
  } catch {
    // Ignore storage persistence errors.
  }
}

function pruneRecentMediaViews(value) {
  const cutoff = Date.now() - RECENT_MEDIA_VIEW_WINDOW_MS;
  const nextEntries = Object.entries(value || {}).filter(([, viewedAt]) =>
    Number(viewedAt || 0) >= cutoff
  );

  return Object.fromEntries(nextEntries);
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
