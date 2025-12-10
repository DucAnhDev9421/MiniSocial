const neo4j = require('neo4j-driver');
const followQueries = require('../models/neo4j/follow.queries');
const friendQueries = require('../models/neo4j/friend.queries');

let driver;

/**
 * Normalize Neo4j URI - chuyển đổi các scheme không hợp lệ
 */
function normalizeUri(uri) {
  if (!uri) return null;
  
  // Nếu URI bắt đầu bằng http hoặc https, chuyển sang bolt
  if (uri.startsWith('http://')) {
    return uri.replace('http://', 'bolt://');
  }
  if (uri.startsWith('https://')) {
    return uri.replace('https://', 'neo4j+s://');
  }
  
  // Kiểm tra các scheme hợp lệ
  const validSchemes = ['bolt://', 'bolt+s://', 'neo4j://', 'neo4j+s://'];
  const hasValidScheme = validSchemes.some(scheme => uri.startsWith(scheme));
  
  if (!hasValidScheme) {
    // Nếu không có scheme, thêm bolt://
    if (!uri.includes('://')) {
      return `bolt://${uri}`;
    }
    throw new Error(`Invalid Neo4j URI scheme. Use one of: ${validSchemes.join(', ')}`);
  }
  
  return uri;
}

async function init({ uri, user, password }) {
  // Làm cho Neo4j optional - nếu không có config thì bỏ qua
  if (!uri || !user || !password) {
    console.warn('⚠️  Neo4j configuration missing. Server will run without Neo4j (some features may not work).');
    return;
  }

  try {
    const normalizedUri = normalizeUri(uri);
    driver = neo4j.driver(normalizedUri, neo4j.auth.basic(user, password));
    // Verify connectivity
    await driver.verifyConnectivity();
    console.log('✅ Connected to Neo4j');
  } catch (error) {
    console.error('❌ Failed to connect to Neo4j:', error.message);
    console.warn('⚠️  Server will continue without Neo4j (some features may not work).');
    // Không throw error để server vẫn có thể chạy
  }
}

function getSession(mode = neo4j.Session.WRITE) {
  if (!driver) {
    throw new Error('Neo4j driver not initialized. Please check your Neo4j configuration.');
  }
  return driver.session({ defaultAccessMode: mode });
}

/**
 * Tạo User node trong Neo4j
 */
async function createUserNode({ id, username, name, email }) {
  const session = getSession();
  try {
    const result = await session.run(
      'MERGE (u:User {id: $id}) SET u.username = $username, u.name = $name, u.email = $email RETURN u',
      { id, username, name, email }
    );
    return result.records[0]?.get('u');
  } finally {
    await session.close();
  }
}

/**
 * Xóa User node và tất cả relationships
 */
async function deleteUserNode(userId) {
  const session = getSession();
  try {
    const result = await session.run(
      'MATCH (u:User {id: $userId}) DETACH DELETE u RETURN COUNT(u) as deleted',
      { userId }
    );
    return result.records[0]?.get('deleted').toNumber() > 0;
  } finally {
    await session.close();
  }
}

/**
 * Follow User
 */
async function followUser(followerId, targetId) {
  const session = getSession();
  try {
    return await followQueries.createFollow(session, followerId, targetId);
  } finally {
    await session.close();
  }
}

/**
 * Unfollow User
 */
async function unfollowUser(followerId, targetId) {
  const session = getSession();
  try {
    return await followQueries.deleteFollow(session, followerId, targetId);
  } finally {
    await session.close();
  }
}

/**
 * Kiểm tra follow status
 */
async function checkFollowStatus(followerId, targetId) {
  const session = getSession(neo4j.Session.READ);
  try {
    return await followQueries.isFollowing(session, followerId, targetId);
  } finally {
    await session.close();
  }
}

/**
 * Lấy danh sách IDs đang follow
 */
async function getFollowingIds(userId) {
  const session = getSession(neo4j.Session.READ);
  try {
    return await followQueries.getFollowingIds(session, userId);
  } finally {
    await session.close();
  }
}

/**
 * Lấy danh sách follower IDs
 */
async function getFollowerIds(userId) {
  const session = getSession(neo4j.Session.READ);
  try {
    return await followQueries.getFollowerIds(session, userId);
  } finally {
    await session.close();
  }
}

/**
 * Lấy follow counts
 */
async function getFollowCounts(userId) {
  const session = getSession(neo4j.Session.READ);
  try {
    const [followingCount, followersCount] = await Promise.all([
      followQueries.getFollowingCount(session, userId),
      followQueries.getFollowersCount(session, userId)
    ]);
    return { followingCount, followersCount };
  } finally {
    await session.close();
  }
}

/**
 * Lấy gợi ý follow
 */
async function getFollowSuggestions(userId, limit = 10) {
  const session = getSession(neo4j.Session.READ);
  try {
    return await followQueries.getFollowSuggestions(session, userId, limit);
  } finally {
    await session.close();
  }
}

/**
 * Lấy mutual friends (từ follow relationships)
 */
async function getMutualFriends(userId1, userId2) {
  const session = getSession(neo4j.Session.READ);
  try {
    return await followQueries.getMutualFriends(session, userId1, userId2);
  } finally {
    await session.close();
  }
}

/**
 * Tạo quan hệ bạn bè
 */
async function createFriend(userId1, userId2) {
  const session = getSession();
  try {
    return await friendQueries.createFriend(session, userId1, userId2);
  } finally {
    await session.close();
  }
}

/**
 * Xóa quan hệ bạn bè
 */
async function deleteFriend(userId1, userId2) {
  const session = getSession();
  try {
    return await friendQueries.deleteFriend(session, userId1, userId2);
  } finally {
    await session.close();
  }
}

/**
 * Kiểm tra có phải bạn bè không
 */
async function checkFriendStatus(userId1, userId2) {
  const session = getSession(neo4j.Session.READ);
  try {
    return await friendQueries.isFriend(session, userId1, userId2);
  } finally {
    await session.close();
  }
}

/**
 * Lấy danh sách bạn bè
 */
async function getFriends(userId, page = 1, limit = 20) {
  const session = getSession(neo4j.Session.READ);
  try {
    return await friendQueries.getFriends(session, userId, page, limit);
  } finally {
    await session.close();
  }
}

/**
 * Lấy danh sách mutual friends (từ friend relationships)
 */
async function getMutualFriendsFromFriends(userId1, userId2) {
  const session = getSession(neo4j.Session.READ);
  try {
    return await friendQueries.getMutualFriends(session, userId1, userId2);
  } finally {
    await session.close();
  }
}

async function close() {
  if (driver) await driver.close();
}

module.exports = { 
  init, 
  getSession, 
  createUserNode,
  deleteUserNode, 
  followUser, 
  unfollowUser, 
  checkFollowStatus, 
  getFollowingIds,
  getFollowerIds,
  getFollowCounts,
  getFollowSuggestions,
  getMutualFriends,
  createFriend,
  deleteFriend,
  checkFriendStatus,
  getFriends,
  getMutualFriendsFromFriends,
  close 
};
