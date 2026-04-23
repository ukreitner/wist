const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const appNodeModules = path.resolve(projectRoot, 'node_modules');
const workspaceNodeModules = path.resolve(workspaceRoot, 'node_modules');
const reactNativeNodeModules = path.resolve(workspaceNodeModules, 'react-native', 'node_modules');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  appNodeModules,
  workspaceNodeModules
];
config.resolver.disableHierarchicalLookup = true;
config.resolver.extraNodeModules = {
  react: path.resolve(appNodeModules, 'react'),
  'react/jsx-dev-runtime': path.resolve(appNodeModules, 'react/jsx-dev-runtime'),
  'react/jsx-runtime': path.resolve(appNodeModules, 'react/jsx-runtime'),
  'react-native': path.resolve(workspaceNodeModules, 'react-native'),
  scheduler: path.resolve(reactNativeNodeModules, 'scheduler')
};

module.exports = config;
