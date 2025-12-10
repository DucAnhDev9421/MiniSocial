/**
 * Neo4j Cypher queries cho Friend relationships
 */

const neo4j = require('neo4j-driver');
const FRIEND_RELATIONSHIP = 'FRIEND';

/**
 * Tạo quan hệ bạn bè (bidirectional)
 */
async function createFriend(session, userId1, userId2) {
  const result = await session.run(
    `MATCH (a:User {id: $userId1}), (b:User {id: $userId2})
     MERGE (a)-[r1:${FRIEND_RELATIONSHIP}]-(b)
     MERGE (b)-[r2:${FRIEND_RELATIONSHIP}]-(a)
     RETURN r1, r2`,
    { userId1, userId2 }
  );
  return result.records.length > 0;
}

/**
 * Xóa quan hệ bạn bè (bidirectional)
 */
async function deleteFriend(session, userId1, userId2) {
  const result = await session.run(
    `MATCH (a:User {id: $userId1})-[r1:${FRIEND_RELATIONSHIP}]-(b:User {id: $userId2})
     DELETE r1
     WITH a, b
     MATCH (b)-[r2:${FRIEND_RELATIONSHIP}]-(a)
     DELETE r2
     RETURN count(r1) + count(r2) as deleted`,
    { userId1, userId2 }
  );
  return result.records[0]?.get('deleted').toNumber() > 0;
}

/**
 * Kiểm tra có phải bạn bè không
 */
async function isFriend(session, userId1, userId2) {
  const result = await session.run(
    `MATCH (a:User {id: $userId1})-[r:${FRIEND_RELATIONSHIP}]-(b:User {id: $userId2})
     RETURN count(r) > 0 as isFriend`,
    { userId1, userId2 }
  );
  return result.records[0]?.get('isFriend') || false;
}

/**
 * Lấy danh sách bạn bè (friends)
 */
async function getFriends(session, userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const limitInt = neo4j.int(Math.floor(limit) || 20);
  const skipInt = neo4j.int(Math.floor(skip) || 0);

  const result = await session.run(
    `MATCH (u:User {id: $userId})-[r:${FRIEND_RELATIONSHIP}]-(friend:User)
     RETURN friend.id as id
     ORDER BY friend.id
     SKIP $skip
     LIMIT $limit`,
    { userId, skip: skipInt, limit: limitInt }
  );
  return result.records.map(record => record.get('id'));
}

/**
 * Lấy danh sách mutual friends
 */
async function getMutualFriends(session, userId1, userId2) {
  const result = await session.run(
    `MATCH (u1:User {id: $userId1})-[r1:${FRIEND_RELATIONSHIP}]-(mutual:User)-[r2:${FRIEND_RELATIONSHIP}]-(u2:User {id: $userId2})
     WHERE u1.id <> u2.id AND mutual.id <> u1.id AND mutual.id <> u2.id
     RETURN mutual.id as id`,
    { userId1, userId2 }
  );
  return result.records.map(record => record.get('id'));
}

module.exports = {
  createFriend,
  deleteFriend,
  isFriend,
  getFriends,
  getMutualFriends
};

