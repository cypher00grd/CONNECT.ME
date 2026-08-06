import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";

// Generate JWT Token
const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_TTL || "15m",
  });
};

const refreshCookieName = process.env.REFRESH_COOKIE_NAME || "connect_refresh";
const refreshTokenDays = Number(process.env.REFRESH_TOKEN_DAYS || 30);
const isProduction = process.env.NODE_ENV === "production";

const hashRefreshToken = (token) => (
  crypto.createHash("sha256").update(token).digest("hex")
);

const createRefreshValue = () => crypto.randomBytes(64).toString("hex");

const getRequestIp = (req) => (
  req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || ""
);

const setRefreshCookie = (res, token) => {
  res.cookie(refreshCookieName, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: refreshTokenDays * 24 * 60 * 60 * 1000,
    path: "/api/auth"
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie(refreshCookieName, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/api/auth"
  });
};

const createRefreshSession = async (user, req, familyId = crypto.randomUUID()) => {
  const refreshToken = createRefreshValue();
  const tokenHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + refreshTokenDays * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    user: user._id,
    tokenHash,
    familyId,
    userAgent: req.get("user-agent") || "",
    ipAddress: getRequestIp(req),
    expiresAt
  });

  return { refreshToken, tokenHash, familyId };
};

const issueAuthSession = async (user, req, res, familyId) => {
  const token = generateAccessToken(user._id);
  const refreshSession = await createRefreshSession(user, req, familyId);
  setRefreshCookie(res, refreshSession.refreshToken);

  return token;
};

const normalizeSkills = (skills) => {
  if (!Array.isArray(skills)) return [];

  return [
    ...new Set(
      skills
        .map((skill) => (typeof skill === "string" ? skill.trim().toLowerCase() : ""))
        .filter(Boolean)
    )
  ].slice(0, 5);
};

const normalizeTechStackList = (items) => {
  if (!Array.isArray(items)) return [];

  return [
    ...new Set(
      items
        .map((item) => (typeof item === "string" ? item.trim().toLowerCase() : ""))
        .filter(Boolean)
    )
  ].slice(0, 8);
};

const normalizeTechStack = (techStack = {}) => ({
  languages: normalizeTechStackList(techStack.languages),
  frameworks: normalizeTechStackList(techStack.frameworks),
  tools: normalizeTechStackList(techStack.tools),
});

const HELP_SESSION_TYPES = new Set([
  'debugging',
  'code_review',
  'pair_programming',
  'architecture_review',
  'mentoring',
  'mock_interview',
  'deployment_help',
  'other'
]);

const normalizeDeveloperPreferences = (preferences = {}) => ({
  preferredSessionTypes: normalizeTechStackList(preferences.preferredSessionTypes)
    .filter((type) => HELP_SESSION_TYPES.has(type)),
  notificationTechTags: normalizeTechStackList(preferences.notificationTechTags).slice(0, 12),
  availabilityTimezone: typeof preferences.availabilityTimezone === 'string'
    ? preferences.availabilityTimezone.trim().slice(0, 80) || 'Asia/Calcutta'
    : 'Asia/Calcutta',
  availabilityNote: typeof preferences.availabilityNote === 'string'
    ? preferences.availabilityNote.trim().slice(0, 240)
    : '',
  hourlyRate: Number.isFinite(Number(preferences.hourlyRate))
    ? Math.max(0, Math.min(Number(preferences.hourlyRate), 100000))
    : 0
});

const deriveSkillsFromTechStack = (techStack = {}) => (
  normalizeSkills([
    ...(techStack.languages || []),
    ...(techStack.frameworks || []),
    ...(techStack.tools || [])
  ])
);

const buildAuthUser = (user, token) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  displayName: user.displayName,
  avatar: user.avatar,
  bio: user.bio,
  githubUsername: user.githubUsername,
  githubUrl: user.githubUrl,
  techStack: user.techStack,
  experienceLevel: user.experienceLevel,
  yearsOfExperience: user.yearsOfExperience,
  specialization: user.specialization,
  skills: user.skills,
  isInstructor: user.isInstructor,
  rating: user.rating,
  reviewsCount: user.reviewsCount,
  ratingTotal: user.ratingTotal,
  ratingCount: user.ratingCount,
  penaltyPoints: user.penaltyPoints,
  reputationPoints: user.reputationPoints,
  completedTickets: user.completedTickets,
  earlyExitCount: user.earlyExitCount,
  badges: user.badges,
  walletBalance: user.walletBalance,
  sessionsCompleted: user.sessionsCompleted,
  issuesResolved: user.issuesResolved,
  codeReviewsGiven: user.codeReviewsGiven,
  hoursHelped: user.hoursHelped,
  topTechTags: user.topTechTags,
  openToMentor: user.openToMentor,
  lookingForHelp: user.lookingForHelp,
  developerPreferences: user.developerPreferences,
  followers: user.followers,
  following: user.following,
  token,
});

// ===================== SIGNUP =====================
export const signup = async (req, res, next) => {
  try {
    const {
      username,
      email,
      password,
      displayName,
      githubUsername,
      githubUrl,
      experienceLevel,
      yearsOfExperience,
      specialization,
      isInstructor,
      openToMentor,
      lookingForHelp,
      developerPreferences
    } = req.body;
    const techStack = normalizeTechStack(req.body.techStack);
    const skills = normalizeSkills(req.body.skills).length > 0
      ? normalizeSkills(req.body.skills)
      : deriveSkillsFromTechStack(techStack);

    if (!username || !email || !password || !displayName) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message:
          existingUser.email === email.toLowerCase()
            ? "Email already exists"
            : "Username already exists",
      });
    }

    const user = await User.create({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: password,
      displayName,
      githubUsername: githubUsername || "",
      githubUrl: githubUrl || "",
      techStack,
      experienceLevel: experienceLevel || "mid",
      yearsOfExperience: yearsOfExperience ?? 0,
      specialization: specialization || "other",
      skills,
      isInstructor: !!(isInstructor || openToMentor),
      openToMentor: !!(openToMentor || isInstructor),
      lookingForHelp: !!lookingForHelp,
      developerPreferences: developerPreferences
        ? normalizeDeveloperPreferences(developerPreferences)
        : undefined
    });

    const token = await issueAuthSession(user, req, res);

    res.status(201).json({
      success: true,
      data: buildAuthUser(user, token),
    });
  } catch (error) {
    console.error("Signup error:", error);
    next(error);
  }
};

// ===================== LOGIN =====================
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = await issueAuthSession(user, req, res);

    res.status(200).json({
      success: true,
      data: buildAuthUser(user, token),
    });
  } catch (error) {
    console.error("Login error:", error);
    next(error);
  }
};

// ===================== REFRESH SESSION =====================
export const refreshSession = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies?.[refreshCookieName];

    if (!rawRefreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh session missing",
      });
    }

    const tokenHash = hashRefreshToken(rawRefreshToken);
    const storedToken = await RefreshToken.findOne({ tokenHash }).populate("user");

    if (storedToken?.revokedAt) {
      await RefreshToken.updateMany(
        { familyId: storedToken.familyId, revokedAt: null },
        { revokedAt: new Date() }
      );

      clearRefreshCookie(res);
      return res.status(401).json({
        success: false,
        message: "Refresh session reuse detected",
      });
    }

    if (!storedToken || storedToken.expiresAt <= new Date()) {
      if (storedToken && !storedToken.revokedAt) {
        storedToken.revokedAt = new Date();
        await storedToken.save();
      }

      clearRefreshCookie(res);
      return res.status(401).json({
        success: false,
        message: "Refresh session expired",
      });
    }

    const user = storedToken.user;
    if (!user) {
      storedToken.revokedAt = new Date();
      await storedToken.save();
      clearRefreshCookie(res);
      return res.status(401).json({
        success: false,
        message: "Refresh session invalid",
      });
    }

    const token = generateAccessToken(user._id);
    const nextSession = await createRefreshSession(user, req, storedToken.familyId);
    storedToken.revokedAt = new Date();
    storedToken.replacedByTokenHash = nextSession.tokenHash;
    await storedToken.save();
    setRefreshCookie(res, nextSession.refreshToken);

    res.status(200).json({
      success: true,
      data: buildAuthUser(user, token),
    });
  } catch (error) {
    console.error("Refresh session error:", error);
    next(error);
  }
};

// ===================== LOGOUT =====================
export const logout = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies?.[refreshCookieName];

    if (rawRefreshToken) {
      await RefreshToken.findOneAndUpdate(
        { tokenHash: hashRefreshToken(rawRefreshToken), revokedAt: null },
        { revokedAt: new Date() }
      );
    }

    clearRefreshCookie(res);

    res.status(200).json({
      success: true,
      message: "Logged out",
    });
  } catch (error) {
    console.error("Logout error:", error);
    next(error);
  }
};

// ===================== GET LOGGED USER =====================
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-password");

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("getMe error:", error);
    next(error);
  }
};

// ===================== UPDATE PROFILE =====================
export const updateProfile = async (req, res, next) => {
  try {
    const {
      displayName,
      bio,
      avatar,
      githubUsername,
      githubUrl,
      experienceLevel,
      yearsOfExperience,
      specialization,
      isInstructor,
      openToMentor,
      lookingForHelp,
      developerPreferences
    } = req.body;
    const techStack = req.body.techStack === undefined ? undefined : normalizeTechStack(req.body.techStack);
    const normalizedDeveloperPreferences = developerPreferences === undefined
      ? undefined
      : normalizeDeveloperPreferences(developerPreferences);
    const skills = req.body.skills === undefined
      ? (techStack === undefined ? undefined : deriveSkillsFromTechStack(techStack))
      : normalizeSkills(req.body.skills);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        ...(displayName && { displayName }),
        ...(bio !== undefined && { bio }),
        ...(avatar !== undefined && { avatar }),
        ...(githubUsername !== undefined && { githubUsername }),
        ...(githubUrl !== undefined && { githubUrl }),
        ...(techStack !== undefined && { techStack }),
        ...(experienceLevel !== undefined && { experienceLevel }),
        ...(yearsOfExperience !== undefined && { yearsOfExperience }),
        ...(specialization !== undefined && { specialization }),
        ...(skills !== undefined && { skills }),
        ...(openToMentor !== undefined && { openToMentor: !!openToMentor, isInstructor: !!openToMentor }),
        ...(isInstructor !== undefined && openToMentor === undefined && { isInstructor: !!isInstructor, openToMentor: !!isInstructor }),
        ...(lookingForHelp !== undefined && { lookingForHelp: !!lookingForHelp }),
        ...(normalizedDeveloperPreferences !== undefined && { developerPreferences: normalizedDeveloperPreferences }),
      },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    next(error);
  }
};
