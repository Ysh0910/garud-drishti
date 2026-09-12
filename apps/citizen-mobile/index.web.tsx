import { AppRegistry } from 'react-native';
import App from './App';

AppRegistry.registerComponent('citizen-mobile', () => App);
AppRegistry.runApplication('citizen-mobile', {
  rootTag: document.getElementById('root'),
});
