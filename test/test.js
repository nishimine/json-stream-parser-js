const { runBasicJsonSyntaxTests } = require('./basic-json-syntax.test');
const { runJsonErrorHandlingTests } = require('./json-error-handling.test');
const { runStreamingProcessingTests } = require('./streaming-processing.test');
const { runJsonPathMatchingTests } = require('./jsonpath-matching.test');
const { runIntegrationTests } = require('./integration.test');

// RFC 8259 準拠テストの実行関数
function runRFC8259ComplianceTests() {
    const { spawn } = require('child_process');
    return new Promise((resolve, reject) => {
        const child = spawn('node', ['test/rfc8259-compliance.test.js'], {
            stdio: 'pipe',
        });

        let output = '';
        child.stdout.on('data', data => {
            output += data.toString();
        });

        child.stderr.on('data', data => {
            output += data.toString();
        });

        child.on('close', code => {
            console.log(output);
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`RFC 8259 compliance tests failed with code ${code}`));
            }
        });
    });
}
function runAllTests() {
    console.log('='.repeat(60));
    console.log('JSON Stream Parser - Comprehensive Test Suite');
    console.log('='.repeat(60));
    console.log();

    const testSuites = [
        { name: 'Basic JSON Syntax Tests', runner: runBasicJsonSyntaxTests },
        {
            name: 'JSON Error Handling Tests',
            runner: runJsonErrorHandlingTests,
        },
        {
            name: 'Streaming Processing Tests',
            runner: runStreamingProcessingTests,
        },
        { name: 'JsonPath Matching Tests', runner: runJsonPathMatchingTests },
        { name: 'Integration Tests', runner: runIntegrationTests },
        {
            name: 'RFC 8259 Compliance Tests',
            runner: runRFC8259ComplianceTests,
            isAsync: true,
        },
    ];

    let passedSuites = 0;
    const startTime = Date.now();

    testSuites.forEach(({ name, runner, isAsync }, index) => {
        console.log(`\n[${index + 1}/${testSuites.length}] Running ${name}...`);
        console.log('-'.repeat(50));

        try {
            const suiteStart = Date.now();

            if (isAsync) {
                // 非同期テストは同期的に実行するため、ブロッキング実装
                const { execSync } = require('child_process');
                try {
                    execSync('node test/rfc8259-compliance.test.js', {
                        stdio: 'inherit',
                    });
                    passedSuites++;
                    const suiteEnd = Date.now();
                    console.log(`✓ ${name} completed in ${suiteEnd - suiteStart}ms`);
                } catch {
                    console.error(`✗ ${name} failed`);
                    // 処理を継続（後で失敗数をカウント）
                }
            } else {
                runner();
                const suiteEnd = Date.now();
                passedSuites++;
                console.log(`✓ ${name} completed in ${suiteEnd - suiteStart}ms`);
            }
        } catch (error) {
            console.error(`✗ ${name} failed:`);
            console.error(`  ${error.message}`);
            console.error(error.stack);
            process.exit(1);
        }
    });

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    console.log(`\n${'='.repeat(60)}`);
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Test Suites: ${testSuites.length}`);
    console.log(`Passed: ${passedSuites}`);
    console.log(`Failed: ${testSuites.length - passedSuites}`);
    console.log(`Total Time: ${totalTime}ms`);
    console.log(`Average per Suite: ${Math.round(totalTime / testSuites.length)}ms`);

    if (passedSuites === testSuites.length) {
        console.log('\n🎉 ALL TESTS PASSED! 🎉');
        console.log('\nJSON Stream Parser is working correctly with:');
        console.log('  ✓ RFC 8259 JSON specification compliance');
        console.log('  ✓ Robust error handling and recovery');
        console.log('  ✓ Efficient streaming and chunk processing');
        console.log('  ✓ Flexible JsonPath pattern matching');
        console.log('  ✓ Real-world integration scenarios');
    } else {
        console.log('\n❌ SOME TESTS FAILED');
        process.exit(1);
    }
}

function test(name, fn) {
    console.log(`Running: ${name}`);
    try {
        fn();
        console.log(`  ✓ ${name}`);
    } catch (error) {
        console.error(`  ✗ ${name}`);
        console.error(`    ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

if (require.main === module) {
    runAllTests();
} else {
    module.exports = {
        runAllTests,
        test,
        assert,
    };
}
