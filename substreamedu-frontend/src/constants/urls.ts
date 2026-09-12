const baseURL = "/";

const users = 'api/users';
const roles = 'api/roles';
const authLogin = 'api/auth/login';
const authVerify = 'api/auth/verify';
const authGoogle = 'api/auth/google';
const login = '/login';
const logout = 'api/auth/logout';
const cabinet = 'api/cabinet';
const dictionary = 'api/dictionary';
const dictionaryResources = 'api/dictionary/resources';
const subtitles = 'api/subtitles';
const uploadSubtitles = 'api/subtitles/upload';
const youtube = 'api/subtitles/youtube';
const processText = 'api/dictionary/process-text';
const payment = 'api/payment';
const lyrics = 'api/lyrics';

const urls = {
  users: users,
  roles: roles,
  auth: {
    login: authLogin,
    logout: logout,
    verify: authVerify,
    google: authGoogle,
    promo: 'api/auth/promo',
  },
  login: login,
  cabinet: cabinet,
  dictionary: dictionary,
  dictionaryResources: dictionaryResources,
  subtitles: subtitles,
  uploadSubtitles: uploadSubtitles,
  youtube: youtube,
  processText: processText,
  payment: payment,
  lyrics: lyrics,
  admin: {
    users: 'api/admin/users',
    userOverview: (userId: string) => `api/dictionary/admin/users/${userId}/overview`,
    userMediaStats: (userId: string) => `api/subtitles/admin/users/${userId}/media-stats`,
  },
};

export { baseURL, urls };