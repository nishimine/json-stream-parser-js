const fs = require('fs');
const path = require('path');

class TestDataLoader {
    /**
     * ファイクスチャファイルを読み込み
     * @param {string} filename ファイル名
     * @returns {string} ファイル内容
     */
    static loadFixture(filename) {
        const filePath = path.join(__dirname, filename);
        if (!fs.existsSync(filePath)) {
            throw new Error(`Fixture file not found: ${filename}`);
        }
        return fs.readFileSync(filePath, 'utf8');
    }

    /**
     * JSONファイクスチャを読み込んでパース
     * @param {string} filename ファイル名
     * @returns {any} パースされたJSONオブジェクト
     */
    static loadJsonFixture(filename) {
        const content = this.loadFixture(filename);
        try {
            return JSON.parse(content);
        } catch (error) {
            throw new Error(`Failed to parse JSON fixture ${filename}: ${error.message}`);
        }
    }

    /**
     * 大きなJSONデータセットを生成
     * @param {number} userCount ユーザー数
     * @param {number} postsPerUser 各ユーザーの投稿数
     * @returns {string} 生成されたJSON文字列
     */
    static generateLargeDataset(userCount = 1000, postsPerUser = 10) {
        // デフォルト: 1000ユーザー x 10投稿
        const users = [];

        for (let i = 1; i <= userCount; i++) {
            const posts = [];
            for (let j = 1; j <= postsPerUser; j++) {
                posts.push({
                    id: i * 100 + j,
                    title: `Post ${j} by User ${i}`,
                    content: `This is the content of post ${j} by user ${i}. `.repeat(10),
                    tags: [`tag${j}`, `user${i}`, 'generated'],
                    metrics: {
                        views: Math.floor(Math.random() * 5000),
                        likes: Math.floor(Math.random() * 500),
                        shares: Math.floor(Math.random() * 50),
                    },
                });
            }

            users.push({
                id: i,
                name: `User ${i}`,
                email: `user${i}@example.com`,
                profile: {
                    age: 20 + Math.floor(Math.random() * 40),
                    city: `City ${i % 10}`,
                    preferences: {
                        theme: i % 2 === 0 ? 'dark' : 'light',
                        language: 'en',
                        notifications: i % 3 === 0 ? ['email', 'push'] : ['email'],
                    },
                },
                posts: posts,
            });
        }

        return JSON.stringify({
            users: users,
            metadata: {
                total_users: userCount,
                posts_per_user: postsPerUser,
                generated_at: new Date().toISOString(),
                api_version: 'v2.1.0',
            },
        });
    }

    /**
     * チャンク化されたデータストリームを生成
     * @param {string} jsonString JSON文字列
     * @param {number} chunkSize チャンクサイズ
     * @returns {Uint8Array[]} チャンクの配列
     */
    static createChunkedStream(jsonString, chunkSize = 1024) {
        // デフォルト: 1KBチャンク
        const data = Buffer.from(jsonString);
        const chunks = [];

        for (let i = 0; i < data.length; i += chunkSize) {
            chunks.push(data.slice(i, i + chunkSize));
        }

        return chunks;
    }

    /**
     * 無効なJSONケースを取得
     * @returns {Array} 無効なJSONケースの配列
     */
    static getInvalidJsonCases() {
        return this.loadJsonFixture('invalid-json-samples.json');
    }

    /**
     * ネストした配列データを取得
     * @returns {Object} ネストした配列データ
     */
    static getNestedArrayData() {
        return this.loadJsonFixture('nested-arrays.json');
    }

    /**
     * 大きなデータセットを取得
     * @returns {Object} 大きなデータセット
     */
    static getLargeDataset() {
        return this.loadJsonFixture('large-dataset.json');
    }
}

module.exports = TestDataLoader;
