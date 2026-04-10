/**
 * karma.conf.js
 * =============
 * Karma test runner configuration for the SMS Trainer Angular application.
 *
 * This configures:
 *   - Jasmine as the test framework (BDD-style describe/it/expect)
 *   - @angular-devkit/build-angular as the Karma plugin (handles TypeScript
 *     compilation, module resolution, and Angular template compilation)
 *   - ChromeHeadlessNoSandbox as the browser (headless Chrome with flags
 *     required for running as root inside CI containers / Kubernetes pods)
 *   - Progress and Kjhtml reporters for terminal and browser-based output
 *
 * Place this file at the project root alongside angular.json.
 *
 * Usage:
 *   ng test                     — runs tests in watch mode
 *   ng test --watch=false       — single run (for CI)
 *   ng test --code-coverage     — generates coverage report in /coverage
 */

module.exports = function (config) {
  config.set({
    /** Base path used to resolve all relative patterns (files, exclude). */
    basePath: '',

    /** Test framework — Jasmine provides describe/it/expect/beforeEach. */
    frameworks: ['jasmine', '@angular-devkit/build-angular'],

    /** Karma plugins required for the Angular + Jasmine + Chrome stack. */
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],

    /** Client-side configuration passed to Jasmine in the browser. */
    client: {
      /** Clear the Jasmine HTML reporter context between test runs. */
      clearContext: false,
      jasmine: {
        /** Randomise test execution order to catch hidden dependencies. */
        random: false,
      },
    },

    /** Coverage instrumentation via Istanbul (built into Karma). */
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/sms-webapp'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
      ],
    },

    /** Output reporters — progress dots in terminal + HTML in browser. */
    reporters: ['progress', 'kjhtml'],

    /** Dev server port for Karma's built-in HTTP server. */
    port: 9876,

    /** Enable coloured output in the terminal. */
    colors: true,

    /**
     * Logging level.  LOG_INFO is a sensible default; use LOG_DEBUG when
     * troubleshooting configuration issues.
     */
    logLevel: config.LOG_INFO,

    /** Re-run tests automatically when source files change. */
    autoWatch: true,

    /**
     * Custom browser launcher for CI environments (Kubernetes, Docker).
     *   --no-sandbox         : required when running as root in containers
     *   --disable-gpu        : prevents GPU-related errors in headless mode
     *   --disable-dev-shm-usage : uses /tmp instead of /dev/shm (often too
     *                             small in container environments)
     */
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
      },
    },

    /**
     * Browser to launch.  ChromeHeadlessNoSandbox is ChromeHeadless with
     * the extra flags needed for CI containers running as root.
     */
    browsers: ['ChromeHeadlessNoSandbox'],

    /**
     * If true, Karma exits after a single test run.  Set to false for
     * interactive watch mode during development.
     */
    singleRun: false,

    /** How long to wait (ms) before a browser is considered disconnected. */
    restartOnFileChange: true,
  });
};