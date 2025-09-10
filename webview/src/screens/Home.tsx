import AndroidScreen from './Android/Android';
import IosScreen from './Ios/Ios';

const HomeScreen = ({ platform }: { platform: 'android' | 'ios' | null }) => {
  if (!platform) {
    return <div>Loading...</div>;
  } else if (platform === 'android') {
    return <AndroidScreen />;
  } else if (platform === 'ios') {
    return <IosScreen />;
  } else {
    return <div>Unknown Platform</div>;
  }
};

export default HomeScreen;
