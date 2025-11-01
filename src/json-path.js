/**
 * JsonPathパターンを解析・保持し、高速なマッチング処理を提供するクラス
 *
 * JsonPathサブセット仕様（RFC 9535のサブセット）:
 * - ワイルドカード（*）は末尾のみサポート
 * - 配列の特定インデックス指定は非サポート（[*]のみ）
 * - 再帰的ワイルドカード（**）は非サポート
 *
 * パフォーマンス最適化:
 * - パターン解析を一度だけ実行し、インスタンスとして保持
 * - 正規表現をプリコンパイルしてマッチング処理を高速化
 * - パターンタイプ別の最適化された判定ロジック
 *
 * @class JsonPath
 */
class JsonPath {
    /**
     * JsonPathパターンを解析し、インスタンスを生成
     *
     * @param {string} pattern - JsonPathパターン（JsonPathサブセット仕様準拠）
     * @throws {Error} パターンが不正な形式の場合
     *
     * @example
     * const path1 = JsonPath.parse('$.users[*]');
     * const path2 = JsonPath.parse('$.config.*');
     */
    constructor(pattern) {
        if (!pattern || typeof pattern !== 'string') {
            throw new Error('JsonPath pattern must be a non-empty string');
        }

        /** @type {string} 元のパターン文字列 */
        this.pattern = pattern;

        /** @type {string} パターンタイプ: 'exact' | 'array_wildcard' | 'object_wildcard' */
        this.type = this._determineType(pattern);

        /** @type {string|null} ベースパス（ワイルドカード部分を除いたパス） */
        this.basePath = this._extractBasePath(pattern, this.type);

        /** @type {RegExp|null} 配列ワイルドカードマッチ用の正規表現（プリコンパイル済み） */
        this.arrayWildcardRegex = this._compileArrayWildcardRegex(pattern, this.type);
    }

    /**
     * JsonPathパターンを解析してインスタンスを生成（ファクトリメソッド）
     *
     * @static
     * @param {string} pattern - JsonPathパターン
     * @returns {JsonPath} JsonPathインスタンス
     */
    static parse(pattern) {
        return new JsonPath(pattern);
    }

    /**
     * パターンタイプを判定
     * @private
     * @param {string} pattern - JsonPathパターン
     * @returns {string} パターンタイプ
     */
    _determineType(pattern) {
        // $.**（再帰的ワイルドカード）は非サポート
        if (pattern.includes('**')) {
            throw new Error(
                `Unsupported JsonPath pattern: "${pattern}". ` +
                    `Recursive wildcard (**) is not supported. ` +
                    `Please use specific paths like '$.*', '$[*]', etc.`
            );
        }
        // 末尾が[*]の場合
        if (pattern.endsWith('[*]')) {
            return 'array_wildcard';
        }
        // 末尾が.*の場合
        if (pattern.endsWith('.*')) {
            return 'object_wildcard';
        }
        // ワイルドカードなし
        return 'exact';
    }

    /**
     * ベースパス（ワイルドカード部分を除いたパス）を抽出
     * @private
     * @param {string} pattern - JsonPathパターン
     * @param {string} type - パターンタイプ
     * @returns {string} ベースパス
     */
    _extractBasePath(pattern, type) {
        if (type === 'array_wildcard') {
            // [*]を除去
            return pattern.slice(0, -3);
        }
        if (type === 'object_wildcard') {
            // .*を除去（'.'も含めて除去）
            return pattern.slice(0, -2);
        }
        // exact: ワイルドカードなしの場合はパターン自体がベースパス
        return pattern;
    }

    /**
     * 配列ワイルドカードマッチ用の正規表現をプリコンパイル
     * @private
     * @param {string} pattern - JsonPathパターン
     * @param {string} type - パターンタイプ
     * @returns {RegExp|null} プリコンパイルされた正規表現、または不要な場合null
     */
    _compileArrayWildcardRegex(pattern, type) {
        if (type !== 'array_wildcard') {
            return null;
        }

        const prefix = pattern.slice(0, -3); // '[*]'を除去

        // プレフィックスが空の場合（$[*]のケース）
        if (prefix === '$') {
            return /^\$\[\d+\]$/;
        }

        // プレフィックスで始まり、その後に[数字]が続く形式にマッチ
        return new RegExp(`^${this._escapeRegex(prefix)}\\[\\d+\\]$`);
    }

    /**
     * 正規表現用の文字列エスケープ
     * @private
     * @param {string} str - エスケープする文字列
     * @returns {string} エスケープされた文字列
     */
    _escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * このパターンが指定されたパスにマッチするか判定
     *
     * @param {string} path - 実際のJsonPath
     * @returns {boolean} マッチする場合true
     *
     * @example
     * const pattern1 = JsonPath.parse('$.users[*]');
     * pattern1.match('$.users[0]') // true
     * pattern1.match('$.users[123]') // true
     * pattern1.match('$.users.name') // false
     *
     * const pattern2 = JsonPath.parse('$.config.*');
     * pattern2.match('$.config.host') // true
     * pattern2.match('$.config.db.host') // false
     */
    match(path) {
        if (!path) return false;

        switch (this.type) {
            case 'exact':
                return this.pattern === path;

            case 'array_wildcard':
                return this.arrayWildcardRegex.test(path);

            case 'object_wildcard':
                return this._matchObjectWildcard(path);

            default:
                return false;
        }
    }

    /**
     * オブジェクトワイルドカードのマッチング処理
     * @private
     * @param {string} path - 実際のJsonPath
     * @returns {boolean} マッチする場合true
     */
    _matchObjectWildcard(path) {
        // ベースパス + '.' で始まる必要がある
        const prefix = `${this.basePath}.`;

        // パスがプレフィックスで始まらない場合は不一致
        if (!path.startsWith(prefix)) {
            return false;
        }

        // プレフィックス以降の部分を取得
        const remaining = path.slice(prefix.length);

        // 残り部分が空の場合は不一致（完全一致になってしまう）
        if (!remaining) {
            return false;
        }

        // 残り部分に '.' や '[' が含まれていないことを確認（1階層のみ）
        return !remaining.includes('.') && !remaining.includes('[');
    }

    /**
     * パターンのベースパスがpathの親または祖先であるかをチェック
     * @private
     * @param {string} path - 実際のJsonPath
     * @returns {boolean} 親または祖先の場合true
     */
    _isPatternDescendantOf(path) {
        // ベースパターンがpathで始まる場合（pathはパターンの親または祖先）
        if (this.basePath.startsWith(path)) {
            const remaining = this.basePath.slice(path.length);
            // 残りが空（親）または区切り文字で始まる場合（祖先）
            return remaining === '' || remaining.startsWith('.') || remaining.startsWith('[');
        }
        return false;
    }

    /**
     * このパターンが指定されたパスの親階層（または自身）であるか判定
     * 親階層の場合、子孫にマッチする値が含まれる可能性がある
     *
     * @param {string} path - 実際のJsonPath
     * @returns {boolean} 親階層またはマッチする値自身の場合true
     *
     * @example
     * const pattern = JsonPath.parse('$.users[*]');
     * pattern.isParentOf('$') // true (親)
     * pattern.isParentOf('$.users') // true (親)
     * pattern.isParentOf('$.users[0]') // true (マッチ)
     * pattern.isParentOf('$.config') // false (無関係)
     */
    isParentOf(path) {
        // 現在のパスがこのパターンにマッチする場合はtrue
        if (this.match(path)) {
            return true;
        }
        return this._isPatternDescendantOf(path);
    }

    /**
     * このパターンにマッチする子孫パスが存在する可能性があるか判定
     * パース戦略の判定に使用（自身がマッチする場合はfalseを返す）
     *
     * @param {string} path - 実際のJsonPath
     * @returns {boolean} 子孫パスがマッチする可能性がある場合true
     *
     * @example
     * const pattern = JsonPath.parse('$.users[*]');
     * pattern.hasMatchingDescendants('$') // true (子孫がマッチ)
     * pattern.hasMatchingDescendants('$.users') // true (子孫がマッチ)
     * pattern.hasMatchingDescendants('$.users[0]') // false (自身がマッチ)
     * pattern.hasMatchingDescendants('$.config') // false (無関係)
     */
    hasMatchingDescendants(path) {
        // 現在のパス自体がマッチする場合はfalse（自身であり子孫ではない）
        if (this.match(path)) {
            return false;
        }
        return this._isPatternDescendantOf(path);
    }
}

module.exports = { JsonPath };
