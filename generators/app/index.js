'use strict'

const Generator = require('yeoman-generator')
const emptyDir = require('empty-dir')
const chalk = require('chalk')
const _ = require('lodash')

class CreateNeocastPlugin extends Generator {
  constructor (args, options) {
    super(args, options)
    this.destinationRoot(this.options.name)
    this.appname = this.determineAppname()
  }

  async prompting () {
    this.props = {
    }

    let prompts = [{
      type: 'confirm',
      name: 'empty',
      message: `This directory (${chalk.blue(this.destinationRoot())}) is ${chalk.red.bold('not')} empty. Should we bail?`,
      default: true,
      when: () => !emptyDir.sync(this.destinationRoot())
    }, {
      type: 'input',
      name: 'title',
      message: `What's your project's title?`,
      default: _.startCase(this.appname),
      when: (props) => !props.empty
    }, {
      type: 'confirm',
      name: 'repo',
      message: 'Create GitHub repository?',
      default: false,
      when: (props) => !props.empty
    }]

    return this.prompt(prompts).then((props) => {
      if (props.empty) {
        this.log(`Whew... ${chalk.green('that was a close one.')} Bye!`)
        process.exit(0)
      } else {
        Object.assign(this.props, props)
      }
    })
  }

  get writing () {
    return {
      webpack () {
        this.fs.copyTpl(
          this.templatePath('webpack.config.js'),
          this.destinationPath('webpack.config.js'),
          this.props
        )
      },

      packageJSON () {
        const pkg = {
          private: true,
        }

        this.fs.writeJSON('package.json', pkg)
      },

      gitIgnore () {
        this.fs.copyTpl(
          this.templatePath('gitignore'),
          this.destinationPath('.gitignore'),
          this.props
        )
      },

      scripts () {
        this.fs.copyTpl(
          this.templatePath('index.js'),
          this.destinationPath('src/index.js'),
          this.props
        )
      },

      readme () {
        this.fs.copyTpl(
          this.templatePath('README.md'),
          this.destinationPath('README.md'),
          this.props
        )
      }
    }
  }

  install () {
    const devDependencies = [
    ]

    devDependencies.push(
      'json-loader',
      'babel-loader',
      'babel-core'
    )

    const dependencies = []

    this.log('Installing dependencies...')

    this.yarnInstall(devDependencies, { 'dev': true })
    this.yarnInstall(dependencies)
  }

  end () {
    if (this.props.repo) {
      this.spawnCommandSync('git', ['init'])
      this.spawnCommandSync('git', ['add', '--all'])
      this.spawnCommandSync('git', ['commit', '--message', '"Hello, App App!"'])
      this.spawnCommandSync('hub', ['create', '-h', this.props.website, _.kebabCase(this.appname)])
      this.spawnCommandSync('git', ['push', '--set-upstream', 'origin', 'master'])
    }
    this.log()
    this.log(chalk.cyan(`Generation of plugin complete... Execute:`))
    this.log(chalk.cyan(`  cd ${this.destinationRoot()}`))
    this.log(chalk.cyan(`to change directory into your new plugin and start coding!`))
    this.log()
  }
}

module.exports = CreateNeocastPlugin
