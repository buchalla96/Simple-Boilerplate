// --------------------------------
//	Gulpfile
// --------------------------------
//
//	Available tasks:
//
//	`gulp` or `gulp watch`.
//	`gulp build:javascript`.
//	`gulp build:styles`.
//
//	`gulp build`.
//	`gulp build --production`.
//
//	`gulp compile:template`
//	`gulp compile:styles`
//	`gulp lint:javascript`
//	`gulp bundle:javascript`
//
// --------------------------------

// --------------------------------
// Load modules
// --------------------------------

var gulp = require("gulp"),
	 browserify = require("browserify"),
	 source = require("vinyl-source-stream"),
	 es = require("event-stream"),
	 glob = require("glob"),
	 babelify = require("babelify"),
	 shim = require("browserify-shim"),
	 es2015 = require("babel-preset-es2015"),
	 browserSync = require("browser-sync"),
	 reload = browserSync.reload,
	 stylish = require("jshint-stylish"),
	 autoprefixer = require("autoprefixer-stylus"),
	 jeet = require("jeet"),
	 poststylus = require("poststylus"),
	 rucksack = require("rucksack-css"),
	 rupture = require("rupture"),
	 plugins = require("gulp-load-plugins")({
		 lazy: false,
		 camelize: true
	 }),
	 config = {
		 production: !!plugins.util.env.production,
		 dev: "./src/",
		 dest: "./assets/",
		 bower: "./bower_components/"
	 },

// --------------------------------
// Tasks Config
// --------------------------------

tasks = {

	compileTemplate: function() {
		return gulp.src(config.dev + "views/pages/**/*.html")
		.pipe(plugins.nunjucksHtml({
			searchPaths: [config.dev + "views/"],
			autoescape: true
		}))
		.pipe(config.production ? plugins.minifyHtml() : plugins.util.noop())
		.pipe(gulp.dest("./"));
	},

	compileStyles: function() {
		return gulp.src(config.dev + "styles/*.styl")
		.pipe(plugins.plumber())
		.pipe(plugins.stylint())
		.pipe(config.production ? plugins.sourcemaps.init() : plugins.util.noop())
		.pipe(plugins.stylus({
			url: {
				name: "embedurl",
				paths: [config.dest + "images"],
				limit: false
			},
			use: [poststylus(rucksack), autoprefixer(), jeet(), rupture()],
			compress: config.production ? true : false
		}))
		.pipe(config.production ? plugins.sourcemaps.write(".") : plugins.util.noop())
		.pipe(gulp.dest(config.dest + "css/"));
	},

	lintCSS: function() {
		return gulp.src(config.dist + "css/*.css")
		.pipe(plugins.csslint(".csslintrc"))
		.pipe(plugins.csslint.reporter());
	},

	bundleJavascript: function(done) {
		glob(config.dev + "scripts/*.js", function(err, files){
			var bundles = files.map(function(file){
				var bundles = browserify(file, {
					debug: true
				})
				.transform(shim)
				.transform(babelify, {presets: ["es2015"]})
				.bundle();
				return bundles
				.pipe(plugins.plumber())
				.pipe(source(file.replace(config.dev + "scripts/", "")))
				.pipe(plugins.streamify(config.production ? plugins.uglify() : plugins.util.noop()))
				.pipe(gulp.dest(config.dest	 + "javascript/"));
			});
			es.merge(bundles).on("end", done);
		});
	},

	lintJavascript: function() {
		return gulp.src([
			"gulpfile.js",
			config.dev + "scripts/main.js",
			config.dev + "scripts/**/*.js"
		]).pipe(plugins.jshint())
		.pipe(plugins.jshint.reporter(stylish));
	},

	optimizeImages: function() {
		return gulp.src(config.dev + "images/**/*.{png,jpg,gif,svg}")
		.pipe(plugins.plumber())
		.pipe(plugins.imagemin({
			optimizationLevel: config.production ? 7 : 3,
			progressive: true,
			interlaced: true
		}))
		.pipe(gulp.dest(config.dest + "images/"));
	}
};

// --------------------------------
// Custom Tasks
// --------------------------------

gulp.task("compile:template", tasks.compileTemplate);
gulp.task("compile:styles", tasks.compileStyles);
gulp.task("lint:css", tasks.lintCSS);
gulp.task("bundle:javascript", tasks.bundleJavascript);
gulp.task("lint:javascript", tasks.lintJavascript);
gulp.task("optimize:images", tasks.optimizeImages);

// --------------------------------
// Task: BrowserSync
// --------------------------------

gulp.task("browser-sync", function(){
	browserSync({
		server: "./"
	});
});

// --------------------------------
// Build and Watch Tasks
// --------------------------------

gulp.task("build:styles", ["compile:styles", "lint:css"]);
gulp.task("build:javascript", ["lint:javascript", "bundle:javascript"]);

gulp.task("watch", ["compile:template","build:styles","build:javascript","browser-sync"], function(){
	gulp.watch(config.dev + "views/**/*.html", ["compile:template"]).on("change", reload);
	gulp.watch(config.dev + "styles/**/*.styl", ["compile:styles"]).on("change", reload);
	gulp.watch(config.dev + "scripts/**/*.js", ["lint:javascript", "bundle:javascript"]).on("change", reload);
});

gulp.task("default", ["watch"]);

gulp.task("build", ["compile:template","build:styles","build:javascript","optimize:images"]);
