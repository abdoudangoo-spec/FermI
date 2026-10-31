import LegalScreen from '../../src/components/LegalScreen';
import { CGU_SECTIONS } from '../../src/constants/legal';

export default function CGU() {
  return <LegalScreen title="Conditions d'utilisation" sections={CGU_SECTIONS} />;
}
