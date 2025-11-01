/**
 * JsonPath フィルタリング機能の使用例
 *
 * このサンプルでは、acceptableJsonPath を使用して
 * 大量のJSONデータから必要な値のみを効率的に抽出する方法を示します。
 */

const { JsonTransformStream } = require('../src/index');

// サンプルデータ: 1000人のユーザー情報
function createLargeUserData() {
    const users = [];
    for (let i = 0; i < 1000; i++) {
        users.push({
            id: i,
            name: `User${i}`,
            email: `user${i}@example.com`,
            age: 20 + (i % 50),
            address: {
                city: `City${i % 10}`,
                zipCode: `${100000 + i}`,
                country: 'Japan',
            },
            profile: {
                bio: `Biography of user ${i}`,
                website: `https://user${i}.example.com`,
                socialMedia: {
                    twitter: `@user${i}`,
                    github: `user${i}`,
                },
            },
        });
    }
    return { users };
}

async function example1_extractSpecificFields() {
    console.log('=== Example 1: Extract only email addresses ===\n');

    const jsonData = JSON.stringify(createLargeUserData());
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(jsonData);

    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(uint8Array);
            controller.close();
        },
    });

    // メールアドレスのみを抽出
    const transformer = new JsonTransformStream({
        acceptableJsonPath: ['$.users[*].email'],
    });

    let count = 0;
    const resultStream = stream.pipeThrough(transformer);

    for await (const { path, value } of resultStream) {
        if (count < 5) {
            // 最初の5件のみ表示
            console.log(`${path}: ${value}`);
        }
        count++;
    }

    console.log(`\nTotal emails extracted: ${count}`);
    console.log(
        'Without filtering, this would process 7000+ values (id, name, email, age, city, zipCode, country, bio, website, twitter, github for each user)\n'
    );
}

async function example2_multiplePatterns() {
    console.log('=== Example 2: Extract multiple fields with patterns ===\n');

    const jsonData = JSON.stringify(createLargeUserData());
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(jsonData);

    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(uint8Array);
            controller.close();
        },
    });

    // 複数のフィールドを指定して抽出
    const transformer = new JsonTransformStream({
        acceptableJsonPath: ['$.users[*].name', '$.users[*].email', '$.users[*].age'],
    });

    let count = 0;
    const resultStream = stream.pipeThrough(transformer);

    for await (const { path, value } of resultStream) {
        if (count < 10) {
            console.log(`${path}: ${value}`);
        }
        count++;
    }

    console.log(`\nTotal values extracted: ${count} (3 fields × 1000 users)`);
    console.log('Only the specified fields are processed\n');
}

async function example3_wildcardPatterns() {
    console.log('=== Example 3: Using wildcard patterns ===\n');

    const jsonData = JSON.stringify(createLargeUserData());
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(jsonData);

    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(uint8Array);
            controller.close();
        },
    });

    // ワイルドカードで全ユーザーの socialMedia 内の全フィールドを抽出
    const transformer = new JsonTransformStream({
        acceptableJsonPath: ['$.users[*].profile.socialMedia.*'],
    });

    let count = 0;
    const resultStream = stream.pipeThrough(transformer);

    for await (const { path, value } of resultStream) {
        if (count < 6) {
            console.log(`${path}: ${value}`);
        }
        count++;
    }

    console.log(`\nTotal social media values extracted: ${count}`);
    console.log('Pattern $.users[*].profile.socialMedia.* matched twitter and github fields\n');
}

async function example4_performanceComparison() {
    console.log('=== Example 4: Performance comparison ===\n');

    const jsonData = JSON.stringify(createLargeUserData());
    const encoder = new TextEncoder();

    // フィルタなし (全てのプリミティブ値)
    console.log('Without filtering ($.**):\n');
    const stream1 = new ReadableStream({
        start(controller) {
            controller.enqueue(encoder.encode(jsonData));
            controller.close();
        },
    });

    const transformer1 = new JsonTransformStream({
        acceptableJsonPath: ['$.**'],
    });

    let count1 = 0;
    const start1 = Date.now();
    for await (const _ of stream1.pipeThrough(transformer1)) {
        count1++;
    }
    const time1 = Date.now() - start1;

    console.log(`  Processed: ${count1} values`);
    console.log(`  Time: ${time1}ms\n`);

    // フィルタあり (emailのみ)
    console.log('With filtering ($.users[*].email):\n');
    const stream2 = new ReadableStream({
        start(controller) {
            controller.enqueue(encoder.encode(jsonData));
            controller.close();
        },
    });

    const transformer2 = new JsonTransformStream({
        acceptableJsonPath: ['$.users[*].email'],
    });

    let count2 = 0;
    const start2 = Date.now();
    for await (const _ of stream2.pipeThrough(transformer2)) {
        count2++;
    }
    const time2 = Date.now() - start2;

    console.log(`  Processed: ${count2} values`);
    console.log(`  Time: ${time2}ms\n`);

    console.log(`Callback reduction: ${count1} → ${count2} (${((1 - count2 / count1) * 100).toFixed(1)}% reduction)`);
    console.log(
        `This means your callback function is called ${count1 - count2} times less, significantly improving performance!\n`
    );
}

// 全ての例を実行
(async () => {
    try {
        await example1_extractSpecificFields();
        await example2_multiplePatterns();
        await example3_wildcardPatterns();
        await example4_performanceComparison();

        console.log('=== All examples completed successfully ===');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
