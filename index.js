#!/usr/bin/env node
'use strict'

const _ = require('lodash')
const fs = require('fs-extra')
const chalk = require('chalk')
const commander = require('commander')

const yeoman = require('yeoman-environment')
const env = yeoman.createEnv()
env.register(require.resolve('./generators/app'), 'app')

const packageJson = require('./package.json')

let projectName

const program = new commander.Command(packageJson.name)
  .version(packageJson.version)
  .arguments('<project-directory>')
  .usage(`${chalk.green('<project-directory>')} [options]`)
  .action(name => {
    projectName = name
  })
  .on('--help', () => {
    console.log(`    Only ${chalk.green('<project-directory>')} is required.`)
  })
  .parse(process.argv)

if (typeof projectName === 'undefined') {
  console.error('Please specify the project directory:')
  console.log(
      `  ${chalk.cyan(program.name())} ${chalk.green('<project-directory>')}`
    )
  console.log()
  console.log('For example:')
  console.log(`  ${chalk.cyan(program.name())} ${chalk.green('my-cool-app')}`)
  console.log()
  console.log(
      `Run ${chalk.cyan(`${program.name()} --help`)} to see all options.`
    )
  process.exit(1)
}

env.run('app', { name: projectName })

//const updateNotifier = require('update-notifier')
//const pkg = require('./package.json')
//
//updateNotifier({
//  pkg,
//  updateCheckInterval: 1, // Hourly
//  callback: (err, update) => {
//    if (err) {
//      console.error(err)
//    } else {
//      if (update.current === update.latest) {
//        fs.ensureDirSync(projectName)
//        env.run('app', { name: projectName })
//      } else {
//        console.log(`
//    Update available: ${update.current} → ${update.latest}
//    Run 'yarn global upgrade create-neocast-plugin' to update.`)
//      }
//    }
//  }
//}).notify()
