export type DeckKind = 'js' | 'react';

interface ClusterRule {
  cluster: string;
  match: RegExp;
}

export const CLUSTERS: Record<DeckKind, ClusterRule[]> = {
  js: [
    {
      cluster: 'Async: event loop, promises, async/await',
      match:
        /promise|async|await|event loop|microtask|settimeout|setinterval|callback|generator|iterator|abort|fetch\b|xhr|ajax|debounc|throttl|requestanimationframe|idle/i,
    },
    {
      cluster: 'Scope, hoisting, TDZ, closures',
      match:
        /scope|hoist|temporal dead|closure|iife|let keyword|\bvar\b|\bconst\b|block|garbage|memory leak/i,
    },
    {
      cluster: 'this, call/apply/bind, functions',
      match:
        /\bthis\b|call.*apply.*bind|arrow function|lambda|first class|higher order|unary|curry|pure function|arguments object|rest parameter|default parameter|recursion|new\.target/i,
    },
    {
      cluster: 'Objects, prototypes, classes, inheritance',
      match:
        /prototype|inherit|class|constructor|instanceof|object\.(create|assign|freeze|seal|defineproperty|entries|keys|values)|getter|setter|mixin|proxy|reflect|symbol|descriptor|shallow|deep (copy|clone)|optional chaining/i,
    },
    {
      cluster: 'Types, coercion, equality',
      match:
        /coercion|== and ===|typeof|\bnan\b|null|undefined|falsy|truthy|primitive|parseint|parsefloat|isnan|bigint|string method|template literal|unicode|type conversion|equality/i,
    },
    {
      cluster: 'Arrays, objects, immutability, data',
      match:
        /array|\bmap\b|\bset\b|weakmap|weakset|slice|splice|reduce|filter|foreach|sort|flat|json|destructur|immutab|spread|iterable|entries/i,
    },
    {
      cluster: 'Modules, tooling, patterns',
      match:
        /module|import|export|commonjs|amd|umd|bundl|tree shak|polyfill|transpil|babel|strict mode|singleton|observer|design pattern|memoization|debug|lint|minif/i,
    },
    {
      cluster: 'Errors, testing, quality',
      match: /error|try.*catch|throw|finally|exception|unit test|\btest\b|assert|jasmine|jest|mocha/i,
    },
    {
      cluster: 'Browser: DOM, storage, network, security',
      match:
        /\bdom\b|event (bubbl|captur|delegat|propagat|listener)|storage|cookie|indexeddb|session|cors|csrf|xss|clickjack|https|service worker|web worker|websocket|sse|postmessage|history api|location|navigator|geolocation|notification|clipboard|observer|shadow dom|custom element|canvas|svg/i,
    },
    {
      cluster: 'Performance, misc APIs',
      match:
        /performance|optimi|lazy|preload|prefetch|cache|memory|profil|animation|intl|\bdate\b|time zone|regex|regular expression|encode|decode|uuid|random|\bmath\b/i,
    },
    // Broad catch-all for plain language questions that no specific rule claimed.
    {
      cluster: 'Language basics and syntax',
      match:
        /javascript|function|variable|operator|statement|expression|keyword|syntax|difference between|what is|how do you/i,
    },
  ],
  react: [
    {
      cluster: 'Hooks: rules, deps, useEffect, memo',
      match:
        /hook|useeffect|usestate|usememo|usecallback|useref|usereducer|usecontext|useimperativehandle|uselayouteffect|useid|usetransition|usedeferred|usesyncexternalstore|stale|dependency array/i,
    },
    {
      cluster: 'Rendering model: VDOM, reconciliation, keys, Fiber',
      match:
        /virtual dom|reconcil|diff|fiber|key prop|"key"|re-?render|batch|strictmode|concurrent|transition|suspense|hydrat|portal|fragment|element vs component|createelement|render (method|phase)|commit/i,
    },
    {
      cluster: 'Components, props, state, composition',
      match:
        /component|props|\bstate\b|lifting state|children|\bhoc\b|higher-?order|render prop|controlled|uncontrolled|pure component|\bmemo\b|forwardref|context|prop.?types|default props|composition/i,
    },
    {
      cluster: 'State management, data fetching',
      match:
        /redux|toolkit|\brtk\b|saga|thunk|mobx|zustand|recoil|flux|store|reducer|action|selector|immer|query|swr|apollo|graphql|axios|fetch data|cache/i,
    },
    {
      cluster: 'Forms and validation',
      match: /form|input|validation|formik|react-?hook-?form|yup|zod|onchange|submit/i,
    },
    {
      cluster: 'Performance and bundling',
      match:
        /performance|optimi|lazy|code split|dynamic import|bundle|memoiz|virtualiz|windowing|profiler|tree shak|preload|web vitals/i,
    },
    // `history` alone also matches "the history behind React", so it is only a routing signal
    // together with the API or hook name.
    {
      cluster: 'Routing',
      match:
        /router|route|navigat|\blink\b|history api|usehistory|browser history|params|redirect|outlet/i,
    },
    {
      cluster: 'Errors, testing, tooling',
      match:
        /error boundary|error handling|test|jest|enzyme|react testing library|cypress|storybook|eslint|devtools|debug|typescript|flow/i,
    },
    {
      cluster: 'SSR, Next.js, ecosystem',
      match:
        /server-?side|\bssr\b|\bssg\b|\bisr\b|next\.?js|gatsby|remix|hydration|streaming|\brsc\b|server component|native|electron|\bpwa\b/i,
    },
    {
      cluster: 'Styling and accessibility',
      match:
        /style|\bcss\b|styled|emotion|tailwind|theme|class(name)?|accessib|aria|i18n|internationali|localiz/i,
    },
    // Broad catch-all so plain "What is React?" style questions still land in a useful bucket.
    {
      cluster: 'React fundamentals and ecosystem',
      match:
        /react|jsx|\bdom\b|library|framework|version|feature|advantage|limitation|create|install|why|what is/i,
    },
  ],
};

export const clusterOf = (title: string, kind: DeckKind) =>
  CLUSTERS[kind].find(rule => rule.match.test(title))?.cluster ?? 'Other / trivia';
