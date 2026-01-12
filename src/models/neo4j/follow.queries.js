/**
 * Neo4j Cypher queries cho Follow relationships
 */

const neo4j = require('neo4j-driver');
const FOLLOWS_RELATIONSHIP = 'FOLLOWS';

/**
 * Tạo quan hệ FOLLOW giữa 2 users
 */
async function createFollow(session, followerId, targetId) {
  const result = await session.run(
    `MATCH (follower:User {id: $followerId}), (target:User {id: $targetId})
     WHERE follower.id <> target.id
     MERGE (follower)-[r:${FOLLOWS_RELATIONSHIP}]->(target)
     RETURN r`,
    { followerId, targetId }
  );
  return result.records.length > 0;
}

/**
 * Xóa quan hệ FOLLOW
 */
async function deleteFollow(session, followerId, targetId) {
  const result = await session.run(
    `MATCH (follower:User {id: $followerId})-[r:${FOLLOWS_RELATIONSHIP}]->(target:User {id: $targetId})
     DELETE r
     RETURN COUNT(r) as deleted`,
    { followerId, targetId }
  );
  return result.records[0]?.get('deleted').toNumber() > 0;
}

/**
 * Kiểm tra user A có follow user B không
 */
async function isFollowing(session, followerId, targetId) {
  const result = await session.run(
    `MATCH (follower:User {id: $followerId})-[r:${FOLLOWS_RELATIONSHIP}]->(target:User {id: $targetId})
     RETURN COUNT(r) as count`,
    { followerId, targetId }
  );
  return result.records[0]?.get('count').toNumber() > 0;
}

/**
 * Lấy danh sách user IDs mà user đang follow
 */
async function getFollowingIds(session, userId) {
  const result = await session.run(
    `MATCH (u:User {id: $userId})-[:${FOLLOWS_RELATIONSHIP}]->(following:User)
     RETURN following.id as id`,
    { userId }
  );
  return result.records.map(record => record.get('id'));
}

/**
 * Lấy danh sách user IDs đang follow user này
 */
async function getFollowerIds(session, userId) {
  const result = await session.run(
    `MATCH (follower:User)-[:${FOLLOWS_RELATIONSHIP}]->(u:User {id: $userId})
     RETURN follower.id as id`,
    { userId }
  );
  return result.records.map(record => record.get('id'));
}

/**
 * Lấy số lượng following của user
 */
async function getFollowingCount(session, userId) {
  const result = await session.run(
    `MATCH (u:User {id: $userId})-[:${FOLLOWS_RELATIONSHIP}]->()
     RETURN COUNT(*) as count`,
    { userId }
  );
  return result.records[0]?.get('count').toNumber();
}

/**
 * Lấy số lượng followers của user
 */
async function getFollowersCount(session, userId) {
  const result = await session.run(
    `MATCH ()-[:${FOLLOWS_RELATIONSHIP}]->(u:User {id: $userId})
     RETURN COUNT(*) as count`,
    { userId }
  );
  return result.records[0]?.get('count').toNumber();
}

/**
 * Gợi ý kết bạn: Lấy bạn chung (mutual friends)
 */
async function getMutualFriends(session, userId1, userId2) {
  const result = await session.run(
    `MATCH (u1:User {id: $userId1})-[:${FOLLOWS_RELATIONSHIP}]->(mutual:User)<-[:${FOLLOWS_RELATIONSHIP}]-(u2:User {id: $userId2})
     RETURN mutual.id as id
     LIMIT 10`,
    { userId1, userId2 }
  );
  return result.records.map(record => record.get('id'));
}

/**
 * Gợi ý follow: Lấy những người mà bạn bè (FRIEND hoặc FOLLOW) đang follow nhưng mình chưa follow
 * Ưu tiên gợi ý từ FRIEND relationships trước
 */
async function getFollowSuggestions(session, userId, limit = 10) {
  // Đảm bảo limit là integer sử dụng neo4j.int()
  const limitInt = neo4j.int(Math.floor(limit) || 10);
  
  // Query kết hợp cả FRIEND và FOLLOW relationships
  // Tách thành 2 query riêng và merge kết quả trong JavaScript để đảm bảo đúng cú pháp
  const friendSuggestions = await session.run(
    `MATCH (me:User {id: $userId})-[:FRIEND]-(friend:User)-[:${FOLLOWS_RELATIONSHIP}]->(suggested:User)
     WHERE me.id <> suggested.id
     AND NOT (me)-[:${FOLLOWS_RELATIONSHIP}]->(suggested)
     AND NOT (me)-[:FRIEND]-(suggested)
     RETURN suggested.id as id, COUNT(DISTINCT friend) as mutualCount`,
    { userId }
  );
  
  const followSuggestions = await session.run(
    `MATCH (me:User {id: $userId})-[:${FOLLOWS_RELATIONSHIP}]->(friend:User)-[:${FOLLOWS_RELATIONSHIP}]->(suggested:User)
     WHERE me.id <> suggested.id
     AND NOT (me)-[:${FOLLOWS_RELATIONSHIP}]->(suggested)
     AND NOT (me)-[:FRIEND]-(suggested)
     RETURN suggested.id as id, COUNT(DISTINCT friend) as mutualCount`,
    { userId }
  );
  
  // Merge kết quả: ưu tiên FRIEND relationships (nhân đôi điểm)
  const suggestionsMap = new Map();
  
  // Thêm suggestions từ FOLLOW (trọng số 1)
  followSuggestions.records.forEach(record => {
    const id = record.get('id');
    const count = record.get('mutualCount').toNumber();
    suggestionsMap.set(id, { id, mutualCount: count, friendCount: 0 });
  });
  
  // Thêm suggestions từ FRIEND (trọng số 2, ưu tiên cao hơn)
  friendSuggestions.records.forEach(record => {
    const id = record.get('id');
    const count = record.get('mutualCount').toNumber();
    const existing = suggestionsMap.get(id);
    if (existing) {
      existing.mutualCount += count * 2; // Nhân đôi cho FRIEND
      existing.friendCount = count;
    } else {
      suggestionsMap.set(id, { id, mutualCount: count * 2, friendCount: count });
    }
  });
  
  // Sắp xếp theo friendCount trước, sau đó mutualCount
  const limitNum = Math.floor(limit) || 10;
  const sortedSuggestions = Array.from(suggestionsMap.values())
    .sort((a, b) => {
      if (b.friendCount !== a.friendCount) {
        return b.friendCount - a.friendCount; // Ưu tiên friendCount cao hơn
      }
      return b.mutualCount - a.mutualCount;
    })
    .slice(0, limitNum);
  
  return sortedSuggestions;
  return result.records.map(record => ({
    id: record.get('id'),
    mutualCount: record.get('mutualCount').toNumber()
  }));
}

module.exports = {
  createFollow,
  deleteFollow,
  isFollowing,
  getFollowingIds,
  getFollowerIds,
  getFollowingCount,
  getFollowersCount,
  getMutualFriends,
  getFollowSuggestions
};

