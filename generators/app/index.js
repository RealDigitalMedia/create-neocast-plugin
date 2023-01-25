'use strict'

const Generator = require('yeoman-generator')
const emptyDir = require('empty-dir')
const chalk = require('chalk')
const _ = require('lodash')

class CreateNeocastPlugin extends Generator {
  constructor(args, options) {
    super(args, options)
    this.destinationRoot(this.options.name)
    this.appname = this.determineAppname()
  }

  async prompting() {
    this.props = {}

    let prompts = [
      {
        type: 'confirm',
        name: 'empty',
        message: `This directory (${chalk.blue(this.destinationRoot())}) is ${chalk.red.bold(
          'not'
        )} empty. Should we bail?`,
        default: true,
        when: () => !emptyDir.sync(this.destinationRoot()),
      },
      {
        type: 'input',
        name: 'title',
        message: `What's your project's title?`,
        default: _.startCase(this.appname),
        when: props => !props.empty,
      },
      {
        type: 'confirm',
        name: 'repo',
        message: 'Create GitHub repository?',
        default: false,
        when: props => !props.empty,
      },
    ]

    return this.prompt(prompts).then(props => {
      if (props.empty) {
        this.log(`Whew... ${chalk.green('that was a close one.')} Bye!`)
        process.exit(0)
      } else {
        // @ts-ignore
        Object.assign(this.props, props)
      }
    })
  }

  get writing() {
    return {
      packageJSON() {
        const pkg = {
          name: 'Title',
          version: '1.0.0',
          description: 'This is your NEOCAST Media Player Plugin.',
          main: 'index.js',
          scripts: {
            run: 'node src/index.js',
            build:
              'esbuild src/index.js --bundle --minify --platform=node --analyze --target=node8 --outfile=dist/index.js',
          },
          dependencies: {},
          author: '',
          license: 'UNLICENSED',
        }
        this.fs.writeJSON(this.destinationPath('package.json'), pkg)
      },

      gitIgnore() {
        this.fs.copyTpl(this.templatePath('gitignore'), this.destinationPath('.gitignore'), this.props)
      },

      scripts() {
        this.fs.copyTpl(this.templatePath('index.js'), this.destinationPath('src/index.js'), this.props)
      },

      readme() {
        this.fs.copyTpl(this.templatePath('README.md'), this.destinationPath('README.md'), this.props)
      },
    }
  }

  install() {
    this.log('Installing dependencies...')
    this.spawnCommandSync('npm', ['i', '-dev', 'json-loader', 'esbuild'])
  }

  end() {
    if (this.props && this.props.repo) {
      this.spawnCommandSync('git', ['init'])
      this.spawnCommandSync('git', ['add', '--all'])
      this.spawnCommandSync('git', ['commit', '--message', '"Hello, App App!"'])
      this.spawnCommandSync('hub', ['create', '-h', this.props.website, _.kebabCase(this.appname)])
      this.spawnCommandSync('git', ['push', '--set-upstream', 'origin', 'master'])
    }
    this.log()
    this.log(chalk.cyan(`Generation of plugin complete... Execute:`))
    this.log(chalk.cyan(`  cd ${this.destinationRoot()}`))
    this.log(chalk.cyan(`to change directory into your new plugin`))
    this.log()
    this.log()
    this.log(chalk.cyan(`When ready to build an uploadable plugin, execute:`))
    this.log(chalk.cyan(`  npm run build`))
    this.log(chalk.cyan(`And look for dist/index.js`))
    this.log()
    this.log()
    this.log(chalk.cyan(`Edit src/index.js to start coding!`))
    this.log()
    this.log()
  }
}

module.exports = CreateNeocastPlugin
