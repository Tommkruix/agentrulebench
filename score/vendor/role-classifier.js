const ROLE_RULES = [
    { role: 'TEST', id: 'test-spec-suffix', test: /\.(test|spec)\.(ts|tsx)$/, confidence: 1 },
    { role: 'CONTROLLER', id: 'controller-suffix', test: /\.controller\.ts$/, confidence: 1 },
    { role: 'SERVICE', id: 'service-suffix', test: /\.service\.ts$/, confidence: 1 },
    { role: 'REPOSITORY', id: 'repository-suffix', test: /\.(repository|repo)\.ts$/, confidence: 1 },
    {
        role: 'WORKER',
        id: 'worker-job-queue-suffix',
        test: /\.(worker|job|queue)\.ts$/,
        confidence: 1,
    },
    { role: 'PROMPT_FILE', id: 'prompt-skill-suffix', test: /\.(prompt|skill)\.ts$/, confidence: 1 },
    {
        role: 'ROUTE_HANDLER',
        id: 'next-app-router-route',
        test: /app\/api\/.*\/route\.tsx?$/,
        confidence: 0.95,
    },
    { role: 'API_HANDLER', id: 'next-pages-api', test: /pages\/api\/.*\.tsx?$/, confidence: 0.95 },
    {
        role: 'TRPC_ROUTER',
        id: 'trpc-router',
        test: /server\/api\/routers\/.*\.ts$/,
        confidence: 0.95,
    },
    {
        role: 'SERVER_ACTION',
        id: 'next-server-action',
        test: /app\/.*\/actions?\.ts$/,
        confidence: 0.9,
    },
    { role: 'DB_MODULE', id: 'db-package', test: /packages\/(db|database)\//, confidence: 0.9 },
    { role: 'SHARED', id: 'shared-package', test: /packages\/shared\//, confidence: 0.9 },
    {
        role: 'DATA_ACCESS',
        id: 'db-directory',
        test: /(\/db\/|\/database\/|\/prisma\/)/,
        confidence: 0.8,
    },
    {
        role: 'ROUTE_ENTRY',
        id: 'next-app-router-entry',
        test: /(^|\/)app\/(.*\/)?(page|layout|template|loading|error|not-found|default|global-error)\.tsx?$/,
        confidence: 0.9,
    },
    { role: 'COMPONENT', id: 'tsx-component', test: /\.tsx$/, confidence: 0.5 },
];
export const ROLE_PATTERNS = new Map(ROLE_RULES.map((rule) => [rule.role, rule.test]));
export function classifyFile(relativePath) {
    const normalizedPath = relativePath.replace(/\\/g, '/');
    for (const rule of ROLE_RULES) {
        if (rule.test.test(normalizedPath)) {
            return { role: rule.role, confidence: rule.confidence, matchedRule: rule.id };
        }
    }
    return { role: 'UNKNOWN', confidence: 0, matchedRule: null };
}
const USE_SERVER_LITERAL = /^["']use server["']/;
const isWhitespace = (c) => c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f' || c === '\v';
export function hasUseServerDirective(sourceHead) {
    let i = 0;
    const n = sourceHead.length;
    for (;;) {
        while (i < n && isWhitespace(sourceHead[i]))
            i++;
        if (sourceHead.startsWith('//', i)) {
            const newline = sourceHead.indexOf('\n', i);
            if (newline === -1)
                return false;
            i = newline + 1;
        }
        else if (sourceHead.startsWith('/*', i)) {
            const end = sourceHead.indexOf('*/', i + 2);
            if (end === -1)
                return false;
            i = end + 2;
        }
        else {
            break;
        }
    }
    return USE_SERVER_LITERAL.test(sourceHead.slice(i));
}
export function classifyFileWithDirective(relativePath, hasServerDirective) {
    const base = classifyFile(relativePath);
    const isTsx = /\.tsx$/.test(relativePath.replace(/\\/g, '/'));
    if (hasServerDirective && base.role === 'UNKNOWN' && !isTsx) {
        return { role: 'SERVER_ACTION', confidence: 0.9, matchedRule: 'use-server-directive' };
    }
    return base;
}
