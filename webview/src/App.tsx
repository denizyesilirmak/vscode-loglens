import './App.css';
import HomeScreen from './screens/Home';
import { usePlatform } from './store/platformStore';
import { useNavigation } from './store/uiStore';

const App = () => {
  const { currentScreen, navigate } = useNavigation();

  const { currentPlatform: panel } = usePlatform();

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen platform={panel} />;
      case 'logs':
        return <div>Logs Screen</div>;
      case 'settings':
        return <div>Settings Screen</div>;
      case 'about':
        return <div>About Screen</div>;
      default:
        return <div>Unknown Screen</div>;
    }
  };

  return <div className="App">{renderScreen()}</div>;
};

export default App;
