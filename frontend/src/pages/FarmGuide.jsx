import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import { sendChatbotMessage } from '../services/api';

const ALL_CROPS = {
  Fruits: [
    { name: 'Sapota', emoji: '🟤' },
    { name: 'Pomegranate', emoji: '🔴' },
    { name: 'Grapes', emoji: '🍇' },
    { name: 'Watermelon', emoji: '🍉' },
    { name: 'Muskmelon', emoji: '🍈' },
    { name: 'Mango', emoji: '🥭' },
    { name: 'Papaya', emoji: '🟠' },
    { name: 'Dragon Fruit', emoji: '🐉' },
    { name: 'Mandarin', emoji: '🍊' },
    { name: 'Apple', emoji: '🍎' },
    { name: 'Guava', emoji: '🟢' },
    { name: 'Strawberry', emoji: '🍓' },
    { name: 'Banana', emoji: '🍌' },
    { name: 'Coconut', emoji: '🥥' },
    { name: 'Pineapple', emoji: '🍍' },
    { name: 'Lemon', emoji: '🍋' },
    { name: 'Jackfruit', emoji: '🟡' },
  ],
  Vegetables: [
    { name: 'Tomato', emoji: '🍅' },
    { name: 'Brinjal', emoji: '🍆' },
    { name: 'Cabbage', emoji: '🥬' },
    { name: 'Cucumber', emoji: '🥒' },
    { name: 'Onion', emoji: '🧅' },
    { name: 'Potato', emoji: '🥔' },
    { name: 'Cauliflower', emoji: '🥦' },
    { name: 'Carrot', emoji: '🥕' },
    { name: 'Spinach', emoji: '🌿' },
    { name: 'Pumpkin', emoji: '🎃' },
    { name: 'Bitter Gourd', emoji: '🟢' },
    { name: 'Bottle Gourd', emoji: '🫙' },
    { name: 'Lady Finger', emoji: '🟩' },
    { name: 'Green Chilli', emoji: '🌶️' },
    { name: 'Garlic', emoji: '🧄' },
    { name: 'Ginger', emoji: '🫚' },
  ],
  'Cash Crops': [
    { name: 'Cotton', emoji: '⚪' },
    { name: 'Sugarcane', emoji: '🎋' },
    { name: 'Tobacco', emoji: '🌿' },
    { name: 'Jute', emoji: '🟤' },
  ],
  Spices: [
    { name: 'Turmeric', emoji: '🟡' },
    { name: 'Chilli', emoji: '🌶️' },
    { name: 'Coriander', emoji: '🌿' },
    { name: 'Cumin', emoji: '🟤' },
    { name: 'Cardamom', emoji: '💚' },
    { name: 'Pepper', emoji: '⚫' },
    { name: 'Fenugreek', emoji: '🌱' },
  ],
  'Oil Seeds': [
    { name: 'Groundnut', emoji: '🥜' },
    { name: 'Soybean', emoji: '🟢' },
    { name: 'Sunflower', emoji: '🌻' },
    { name: 'Mustard', emoji: '🟡' },
    { name: 'Sesame', emoji: '⚪' },
  ],
  Pulses: [
    { name: 'Chickpea', emoji: '🟡' },
    { name: 'Lentil', emoji: '🟠' },
    { name: 'Green Gram', emoji: '💚' },
    { name: 'Black Gram', emoji: '⚫' },
    { name: 'Pigeon Pea', emoji: '🟤' },
    { name: 'Kidney Bean', emoji: '🔴' },
  ],
  'Plantation Crops': [
    { name: 'Coffee', emoji: '☕' },
    { name: 'Tea', emoji: '🍵' },
    { name: 'Rubber', emoji: '⚫' },
    { name: 'Arecanut', emoji: '🌴' },
    { name: 'Cashew', emoji: '🥜' },
  ],
  Cereals: [
    { name: 'Rice', emoji: '🌾' },
    { name: 'Wheat', emoji: '🌾' },
    { name: 'Maize', emoji: '🌽' },
    { name: 'Ragi', emoji: '🟤' },
    { name: 'Jowar', emoji: '🌾' },
    { name: 'Bajra', emoji: '🌾' },
    { name: 'Barley', emoji: '🌾' },
  ],
};

const CROP_STAGES = {
  Tomato: [
    { name: 'Germination', days: '0-10 days', level: 1 },
    { name: 'Seedling', days: '11-25 days', level: 2 },
    { name: 'Vegetative', days: '26-45 days', level: 3 },
    { name: 'Flowering', days: '46-65 days', level: 4 },
    { name: 'Fruiting', days: '66-90 days', level: 5 },
  ],
  Rice: [
    { name: 'Germination', days: '0-7 days', level: 1 },
    { name: 'Seedling', days: '8-30 days', level: 2 },
    { name: 'Tillering', days: '31-60 days', level: 3 },
    { name: 'Flowering', days: '61-90 days', level: 4 },
    { name: 'Harvest', days: '91-120 days', level: 5 },
  ],
  Wheat: [
    { name: 'Germination', days: '0-7 days', level: 1 },
    { name: 'Seedling', days: '8-21 days', level: 2 },
    { name: 'Tillering', days: '22-60 days', level: 3 },
    { name: 'Heading', days: '61-90 days', level: 4 },
    { name: 'Harvest', days: '91-120 days', level: 5 },
  ],
  Maize: [
    { name: 'Germination', days: '0-7 days', level: 1 },
    { name: 'Seedling', days: '8-21 days', level: 2 },
    { name: 'Vegetative', days: '22-45 days', level: 3 },
    { name: 'Tasseling', days: '46-65 days', level: 4 },
    { name: 'Harvest', days: '66-90 days', level: 5 },
  ],
  Onion: [
    { name: 'Germination', days: '0-10 days', level: 1 },
    { name: 'Seedling', days: '11-40 days', level: 2 },
    { name: 'Bulb Init', days: '41-70 days', level: 3 },
    { name: 'Bulb Dev', days: '71-100 days', level: 4 },
    { name: 'Harvest', days: '101-130 days', level: 5 },
  ],
};

const TREE_STAGES = [
  { name: 'First Year', days: '0-365 days', level: 1 },
  { name: 'Second Year', days: '366-730 days', level: 2 },
  { name: 'Third Year', days: '731-1095 days', level: 3 },
  { name: 'Fourth Year', days: '1096-1460 days', level: 4 },
  { name: 'Fifth Year+', days: '1461+ days', level: 5 },
];

const TREE_CROPS = new Set([
  'Mango',
  'Sapota',
  'Coconut',
  'Guava',
  'Jackfruit',
  'Pomegranate',
  'Apple',
  'Coffee',
  'Tea',
  'Arecanut',
]);

const CROP_PESTS = {
  Tomato: [
    { name: 'Aphids', emoji: '🐛' },
    { name: 'Whitefly', emoji: '🦟' },
    { name: 'Fusarium Wilt', emoji: '🍂' },
    { name: 'Early Blight', emoji: '🟤' },
    { name: 'Leaf Curl', emoji: '🌿' },
    { name: 'Spider Mite', emoji: '🕷️' },
  ],
  Rice: [
    { name: 'Stem Borer', emoji: '🐛' },
    { name: 'Brown Planthopper', emoji: '🐞' },
    { name: 'Blast', emoji: '💨' },
    { name: 'Sheath Blight', emoji: '🟤' },
    { name: 'Leaf Folder', emoji: '🌿' },
    { name: 'Gall Midge', emoji: '🦟' },
  ],
  Maize: [
    { name: 'Fall Armyworm', emoji: '🐛' },
    { name: 'Corn Borer', emoji: '🐛' },
    { name: 'Grey Leaf Spot', emoji: '🔵' },
    { name: 'Downy Mildew', emoji: '💧' },
    { name: 'Aphids', emoji: '🐜' },
    { name: 'Cutworm', emoji: '🐛' },
  ],
  Onion: [
    { name: 'Thrips', emoji: '🦟' },
    { name: 'Purple Blotch', emoji: '🟣' },
    { name: 'Downy Mildew', emoji: '💧' },
    { name: 'Neck Rot', emoji: '🟤' },
    { name: 'Stemphylium', emoji: '🍂' },
    { name: 'Leaf Miner', emoji: '🐛' },
  ],
};

const DEFAULT_PESTS = [
  { name: 'Aphids', emoji: '🐛' },
  { name: 'Whitefly', emoji: '🦟' },
  { name: 'Leaf Blight', emoji: '🍂' },
  { name: 'Powdery Mildew', emoji: '⚪' },
  { name: 'Root Rot', emoji: '🟤' },
  { name: 'Caterpillar', emoji: '🐛' },
];

const PRACTICES = [
  { name: 'Climate requirement', emoji: '🌡️' },
  { name: 'Soil requirement', emoji: '🌱' },
  { name: 'Land preparation', emoji: '🚜' },
  { name: 'Season, Seed and sowing', emoji: '🌿' },
  { name: 'Variety recommendation', emoji: '🧬' },
  { name: 'Seed selection and treatment', emoji: '🫘' },
  { name: 'Irrigation management', emoji: '💧' },
  { name: 'Nutrient management', emoji: '🌿' },
  { name: 'Pest management', emoji: '🐛' },
  { name: 'Disease management', emoji: '🦠' },
  { name: 'Harvesting', emoji: '✂️' },
  { name: 'Post-harvest', emoji: '📦' },
];

const SAMPLE_QA = {
  Tomato: [
    {
      question: 'My tomato leaves are turning yellow and curling. What disease is this and how to treat it?',
      answer: 'This appears to be Tomato Leaf Curl Virus spread by whiteflies. Spray imidacloprid 0.3ml/L water. Remove infected plants immediately.',
      date: '21 Mar',
    },
    {
      question: 'When is the best time to transplant tomato seedlings in Karnataka?',
      answer: 'In Karnataka transplant tomato seedlings when they are 25-30 days old during June-July for kharif season.',
      date: '20 Mar',
    },
    {
      question: 'How much fertilizer should I apply per acre for tomato crop?',
      answer: 'Apply 120kg N, 80kg P, 80kg K per acre. Split nitrogen in 3 doses: at planting, 30 days, 60 days.',
      date: '19 Mar',
    },
  ],
};

const PEST_COLORS = ['#2d6a4f', '#1b4332', '#40916c', '#52b788', '#74c69d'];
const PRACTICE_COLORS = ['#2d5016', '#1a3a0a', '#3d6b1f', '#4a7c23', '#1b4332', '#2d6a4f', '#40916c', '#1a3a0a'];

const DEFAULT_STAGES = [
  { name: 'Germination', days: '0-10 days', level: 1 },
  { name: 'Seedling', days: '11-25 days', level: 2 },
  { name: 'Vegetative', days: '26-45 days', level: 3 },
  { name: 'Flowering', days: '46-70 days', level: 4 },
  { name: 'Harvest', days: '71-110 days', level: 5 },
];

const getAllCropEntries = () => Object.values(ALL_CROPS).flat();
const getCropByName = (name) => getAllCropEntries().find((item) => item.name === name);

const renderPlant = (level) => {
  const stemHeight = [14, 22, 30, 36, 42][level - 1] || 22;
  const leafCount = [2, 4, 6, 8, 8][level - 1] || 4;
  const flowerCount = level >= 5 ? 3 : 0;

  return (
    <div className="plant-art">
      <div className="plant-stem" style={{ height: stemHeight }} />
      {[...Array(leafCount)].map((_, index) => (
        <span
          key={`leaf-${level}-${index}`}
          className={index % 2 === 0 ? 'plant-leaf left' : 'plant-leaf right'}
          style={{ bottom: 6 + (index * 4), opacity: 0.9 - (index * 0.05) }}
        />
      ))}
      {flowerCount > 0 ? [...Array(flowerCount)].map((_, index) => (
        <span key={`flower-${index}`} className="plant-flower" style={{ left: 20 + (index * 10) }} />
      )) : null}
    </div>
  );
};

export default function FarmGuide() {
  const { language } = useLanguage();
  const [myCrops, setMyCrops] = useState(
    JSON.parse(localStorage.getItem('my_crops') || '[]')
  );
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [activeCategory, setActiveCategory] = useState('Fruits');
  const [activeStage, setActiveStage] = useState(0);
  const [view, setView] = useState('selection');
  const [practiceModal, setPracticeModal] = useState(null);
  const [practiceContent, setPracticeContent] = useState('');
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [queryModal, setQueryModal] = useState(false);
  const [queryText, setQueryText] = useState('');
  const [queryAnswer, setQueryAnswer] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);

  const categories = Object.keys(ALL_CROPS);

  const currentCategoryCrops = ALL_CROPS[activeCategory] || [];

  const cropStages = useMemo(() => {
    if (!selectedCrop) return DEFAULT_STAGES;
    if (TREE_CROPS.has(selectedCrop.name)) return TREE_STAGES;
    return CROP_STAGES[selectedCrop.name] || DEFAULT_STAGES;
  }, [selectedCrop]);

  const pests = useMemo(() => {
    if (!selectedCrop) return DEFAULT_PESTS;
    return CROP_PESTS[selectedCrop.name] || DEFAULT_PESTS;
  }, [selectedCrop]);

  const qaList = useMemo(() => {
    if (!selectedCrop) return SAMPLE_QA.Tomato;
    return SAMPLE_QA[selectedCrop.name] || SAMPLE_QA.Tomato;
  }, [selectedCrop]);

  const activeStageName = cropStages[activeStage]?.name || cropStages[0]?.name || 'Growth';

  const persistMyCrops = (nextCrops) => {
    setMyCrops(nextCrops);
    localStorage.setItem('my_crops', JSON.stringify(nextCrops));
  };

  const toggleCropSelection = (crop) => {
    const exists = myCrops.some((item) => item.name === crop.name);
    if (exists) {
      persistMyCrops(myCrops.filter((item) => item.name !== crop.name));
      return;
    }

    if (myCrops.length >= 10) {
      toast.error('Maximum 10 crops can be selected.');
      return;
    }

    persistMyCrops([...myCrops, crop]);
  };

  const removeCrop = (cropName) => {
    persistMyCrops(myCrops.filter((crop) => crop.name !== cropName));
  };

  const openCropDetail = (crop) => {
    setSelectedCrop(crop);
    setActiveStage(0);
    setView('detail');
  };

  const onSaveMyCrops = () => {
    localStorage.setItem('my_crops', JSON.stringify(myCrops));
    toast.success('My crops saved successfully.');
  };

  const fetchPracticeDetails = async (practice) => {
    if (!selectedCrop) return;

    setPracticeModal(practice);
    setPracticeLoading(true);
    setPracticeContent('');

    try {
      const response = await sendChatbotMessage({
        language,
        message: `Give me detailed ${practice.name} guidelines for ${selectedCrop.name} crop in 5 bullet points. Be specific and practical for Indian farmers.`,
        conversationHistory: [],
      });

      setPracticeContent(
        response.response_text
        || response.reply
        || response.message
        || 'Unable to fetch practice details at the moment.'
      );
    } catch (error) {
      setPracticeContent('Unable to fetch practice details at the moment. Please try again.');
    } finally {
      setPracticeLoading(false);
    }
  };

  const submitExpertQuery = async () => {
    const trimmed = queryText.trim();
    if (!trimmed || !selectedCrop) {
      toast.error('Please describe your problem first.');
      return;
    }

    setQueryLoading(true);
    setQueryAnswer('');

    try {
      const response = await sendChatbotMessage({
        language,
        message: `Farmer query for ${selectedCrop.name}: ${trimmed}`,
        conversationHistory: [],
      });

      setQueryAnswer(
        response.response_text
        || response.reply
        || response.message
        || 'No response generated.'
      );
    } catch (error) {
      setQueryAnswer('Unable to generate expert answer. Please try again.');
    } finally {
      setQueryLoading(false);
    }
  };

  return (
    <div className="jk-wrap">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap');

          .jk-wrap {
            background: #ffffff;
            color: #1a1a1a;
            min-height: 100vh;
            font-family: 'DM Sans', sans-serif;
            padding-bottom: 2rem;
          }

          .jk-header {
            background: #16a34a;
            color: white;
            padding: 0.85rem 1rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .jk-header h2 {
            margin: 0;
            font-size: 1.02rem;
            font-weight: 700;
            text-align: center;
            flex: 1;
            font-family: 'Playfair Display', serif;
          }

          .jk-back-btn {
            border: none;
            background: transparent;
            color: white;
            font-size: 1.2rem;
            cursor: pointer;
            width: 28px;
          }

          .jk-body {
            padding: 1rem;
            max-width: 1080px;
            margin: 0 auto;
          }

          .jk-title {
            font-family: 'Playfair Display', serif;
            font-size: 1.45rem;
            margin: 0;
          }

          .jk-subtitle {
            margin: 0.3rem 0 1rem;
            color: #4b5563;
            font-size: 0.9rem;
          }

          .section {
            margin: 1.5rem 0;
          }

          .section-head {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.8rem;
          }

          .section-title {
            font-weight: 700;
            font-size: 1.3rem;
            color: #1a1a1a;
            margin: 0;
          }

          .view-all {
            color: #16a34a;
            font-size: 0.85rem;
            font-weight: 600;
            background: transparent;
            border: none;
            cursor: pointer;
          }

          .horizontal-scroll {
            display: flex;
            gap: 0.75rem;
            overflow-x: auto;
            padding-bottom: 0.3rem;
            -ms-overflow-style: none;
            scrollbar-width: none;
          }

          .horizontal-scroll::-webkit-scrollbar {
            display: none;
          }

          .crop-chip {
            min-width: 86px;
            background: #fff;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
            padding: 0.45rem;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            position: relative;
            cursor: pointer;
          }

          .crop-chip.active {
            border: 2px solid #16a34a;
            background: #f0fdf4;
          }

          .crop-emoji-box {
            width: 40px;
            height: 40px;
            margin: 0 auto 0.35rem;
            border-radius: 10px;
            background: #ecfdf5;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
          }

          .crop-chip p {
            margin: 0;
            color: #166534;
            font-size: 0.75rem;
            font-weight: 600;
          }

          .remove-btn {
            position: absolute;
            top: 3px;
            right: 3px;
            border: none;
            border-radius: 999px;
            width: 18px;
            height: 18px;
            cursor: pointer;
            font-size: 0.7rem;
            background: #fee2e2;
            color: #dc2626;
          }

          .add-crop-btn {
            min-width: 86px;
            border: 1px dashed #16a34a;
            border-radius: 12px;
            background: #f0fdf4;
            color: #166534;
            font-weight: 600;
            cursor: pointer;
            padding: 0.45rem;
          }

          .tab-pill {
            border-radius: 999px;
            padding: 0.5rem 0.9rem;
            font-size: 0.82rem;
            font-weight: 600;
            white-space: nowrap;
            border: 1px solid #e5e7eb;
            background: white;
            color: #666;
            cursor: pointer;
          }

          .tab-pill.active {
            background: #16a34a;
            color: white;
            border-color: #16a34a;
          }

          .crop-pick-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 0.65rem;
            margin-top: 1rem;
          }

          .crop-pick-card {
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            text-align: center;
            padding: 0.6rem 0.4rem;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            background: #fff;
            position: relative;
          }

          .crop-pick-card.selected {
            border: 2px solid #16a34a;
            background: #f0fdf4;
          }

          .crop-pick-card .emoji {
            font-size: 1.3rem;
            display: block;
          }

          .crop-pick-card .name {
            font-size: 0.72rem;
            margin-top: 0.25rem;
            color: #374151;
            font-weight: 600;
          }

          .crop-check {
            position: absolute;
            top: 6px;
            right: 6px;
            color: #16a34a;
            font-size: 0.8rem;
            font-weight: 700;
          }

          .save-btn {
            margin-top: 1rem;
            width: 100%;
            border: none;
            background: #16a34a;
            color: #fff;
            border-radius: 12px;
            padding: 0.8rem;
            font-weight: 700;
            cursor: pointer;
          }

          .stage-card {
            min-width: 170px;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            padding: 0.7rem;
            cursor: pointer;
          }

          .stage-card.active {
            background: #dcfce7;
            border: 1px solid #16a34a;
          }

          .stage-name {
            font-size: 0.88rem;
            font-weight: 700;
            margin: 0;
          }

          .stage-days {
            margin: 0.2rem 0 0.45rem;
            color: #4b5563;
            font-size: 0.75rem;
          }

          .plant-art {
            position: relative;
            width: 100%;
            height: 78px;
            border-radius: 10px;
            background: linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%);
            overflow: hidden;
          }

          .plant-stem {
            width: 6px;
            background: #16a34a;
            border-radius: 8px;
            position: absolute;
            bottom: 8px;
            left: 50%;
            transform: translateX(-50%);
          }

          .plant-leaf {
            position: absolute;
            width: 12px;
            height: 8px;
            background: #22c55e;
            border-radius: 999px;
          }

          .plant-leaf.left {
            left: calc(50% - 14px);
            transform: rotate(-30deg);
          }

          .plant-leaf.right {
            right: calc(50% - 14px);
            transform: rotate(30deg);
          }

          .plant-flower {
            position: absolute;
            top: 10px;
            width: 10px;
            height: 10px;
            border-radius: 999px;
            background: #f59e0b;
            border: 2px solid #fde68a;
          }

          .pest-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 0.7rem;
          }

          .pest-card {
            text-align: center;
          }

          .pest-box {
            width: 100%;
            aspect-ratio: 1 / 1;
            min-height: 120px;
            max-height: 130px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-size: 3rem;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          }

          .pest-name {
            margin-top: 0.35rem;
            font-size: 0.78rem;
            color: #1f2937;
            font-weight: 600;
          }

          .practice-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.7rem;
          }

          .practice-card {
            border: none;
            border-radius: 12px;
            height: 160px;
            color: #fff;
            padding: 1rem;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: flex-start;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            text-align: left;
          }

          .practice-emoji {
            font-size: 2.5rem;
            line-height: 1;
            align-self: center;
          }

          .practice-name {
            font-size: 0.9rem;
            font-weight: 700;
          }

          .qa-row {
            display: flex;
            gap: 0.75rem;
            overflow-x: auto;
            padding-bottom: 0.3rem;
            -ms-overflow-style: none;
            scrollbar-width: none;
          }

          .qa-row::-webkit-scrollbar {
            display: none;
          }

          .qa-card {
            min-width: 280px;
            max-width: 280px;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            background: #fff;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            padding: 1rem;
          }

          .qa-meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.5rem;
            font-size: 0.72rem;
            color: #6b7280;
          }

          .avatar-dot {
            width: 32px;
            height: 32px;
            border-radius: 999px;
            background: #16a34a;
            color: #fff;
            font-weight: 700;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-right: 0.45rem;
            flex-shrink: 0;
          }

          .qa-question {
            margin: 0.8rem 0 0.4rem;
            font-size: 0.9rem;
            color: #111827;
            line-height: 1.35;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .link-like {
            color: #16a34a;
            font-size: 0.82rem;
            font-weight: 600;
            border: none;
            background: transparent;
            padding: 0;
            cursor: pointer;
          }

          .qa-expert {
            margin-top: 0.65rem;
            border-top: 1px solid #e5e7eb;
            padding-top: 0.65rem;
          }

          .expert-box {
            background: #f3f4f6;
            border-radius: 8px;
            padding: 0.6rem;
          }

          .expert-row {
            display: flex;
            gap: 0.45rem;
            align-items: center;
            font-size: 0.72rem;
            color: #4b5563;
            margin-bottom: 0.45rem;
          }

          .expert-logo {
            width: 24px;
            height: 24px;
            border-radius: 999px;
            background: #16a34a;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.62rem;
            font-weight: 700;
          }

          .expert-preview {
            margin: 0;
            font-size: 0.82rem;
            color: #6b7280;
            line-height: 1.35;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .ask-btn {
            width: 100%;
            margin-top: 0.9rem;
            border: 1px solid #16a34a;
            background: #fff;
            color: #16a34a;
            border-radius: 25px;
            padding: 0.8rem;
            font-weight: 700;
            cursor: pointer;
          }

          .modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.45);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
          }

          .modal-card {
            width: min(680px, 100%);
            max-height: 85vh;
            overflow-y: auto;
            background: #fff;
            border-radius: 16px;
            padding: 1rem;
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 0.5rem;
          }

          .modal-header h4 {
            margin: 0;
            font-size: 1.05rem;
          }

          .close-btn {
            border: none;
            background: #f3f4f6;
            border-radius: 999px;
            width: 30px;
            height: 30px;
            cursor: pointer;
            font-weight: 700;
          }

          .practice-content {
            margin-top: 0.9rem;
            white-space: pre-wrap;
            font-size: 0.92rem;
            line-height: 1.6;
            color: #1f2937;
          }

          .query-textarea {
            width: 100%;
            min-height: 120px;
            border-radius: 12px;
            border: 1px solid #d1d5db;
            padding: 0.7rem;
            font-family: inherit;
            font-size: 0.92rem;
            resize: vertical;
          }

          .submit-btn {
            margin-top: 0.75rem;
            width: 100%;
            border: none;
            background: #16a34a;
            color: #fff;
            border-radius: 12px;
            padding: 0.8rem;
            font-weight: 700;
            cursor: pointer;
          }

          .spinner {
            width: 22px;
            height: 22px;
            border: 3px solid #bbf7d0;
            border-top-color: #16a34a;
            border-radius: 999px;
            animation: spin 0.8s linear infinite;
            margin: 0.8rem auto;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          @media (min-width: 768px) {
            .jk-body {
              padding: 1.25rem;
            }

            .crop-pick-grid {
              gap: 0.8rem;
            }
          }
        `}
      </style>

      {view === 'detail' ? (
        <header className="jk-header">
          <button type="button" className="jk-back-btn" onClick={() => setView('selection')}>←</button>
          <h2>{selectedCrop?.name || 'Crop Detail'}</h2>
          <div style={{ width: 28 }} />
        </header>
      ) : null}

      <main className="jk-body">
        {view === 'selection' ? (
          <>
            <h1 className="jk-title">Farm Guide</h1>
            <p className="jk-subtitle">Select crops and explore practical stage-wise guidance.</p>

            <section className="section">
              <div className="section-head">
                <h3 className="section-title">My Crops</h3>
              </div>

              <div className="horizontal-scroll">
                {myCrops.map((crop) => (
                  <button
                    key={crop.name}
                    type="button"
                    className={`crop-chip ${selectedCrop?.name === crop.name ? 'active' : ''}`}
                    onClick={() => openCropDetail(crop)}
                  >
                    <span className="crop-emoji-box">{crop.emoji}</span>
                    <p>{crop.name}</p>
                    <span
                      className="remove-btn"
                      role="presentation"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeCrop(crop.name);
                      }}
                    >
                      ×
                    </span>
                  </button>
                ))}

                <button type="button" className="add-crop-btn" onClick={() => toast('Pick crops below to add.')}>+ Add</button>
              </div>

              <div className="horizontal-scroll" style={{ marginTop: '0.9rem' }}>
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={`tab-pill ${activeCategory === category ? 'active' : ''}`}
                    onClick={() => setActiveCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div className="crop-pick-grid">
                {currentCategoryCrops.map((crop) => {
                  const selected = myCrops.some((item) => item.name === crop.name);

                  return (
                    <button
                      key={crop.name}
                      type="button"
                      className={`crop-pick-card ${selected ? 'selected' : ''}`}
                      onClick={() => toggleCropSelection(crop)}
                    >
                      {selected ? <span className="crop-check">✓</span> : null}
                      <span className="emoji">{crop.emoji}</span>
                      <span className="name">{crop.name}</span>
                    </button>
                  );
                })}
              </div>

              <button type="button" className="save-btn" onClick={onSaveMyCrops}>Save</button>
            </section>
          </>
        ) : null}

        {view === 'detail' && selectedCrop ? (
          <>
            <section className="section">
              <div className="section-head">
                <h3 className="section-title">Crop Growth Stages</h3>
              </div>

              <div className="horizontal-scroll">
                {cropStages.map((stage, index) => (
                  <article
                    key={`${stage.name}-${stage.days}`}
                    className={`stage-card ${activeStage === index ? 'active' : ''}`}
                    onClick={() => setActiveStage(index)}
                    role="presentation"
                  >
                    <p className="stage-name">{stage.name}</p>
                    <p className="stage-days">{stage.days}</p>
                    {renderPlant(stage.level)}
                  </article>
                ))}
              </div>
            </section>

            <section className="section">
              <div className="section-head">
                <div>
                  <h3 className="section-title" style={{ fontSize: '1.4rem' }}>Pests and diseases.</h3>
                  <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.86rem' }}>
                    Showing results for {activeStageName}
                  </p>
                </div>
                <button type="button" className="view-all">View all</button>
              </div>

              <div className="pest-grid">
                {pests.map((pest, index) => (
                  <article key={pest.name} className="pest-card">
                    <div className="pest-box" style={{ background: PEST_COLORS[index % PEST_COLORS.length] }}>{pest.emoji}</div>
                    <p className="pest-name">{pest.name}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="section">
              <div className="section-head">
                <h3 className="section-title" style={{ fontSize: '1.4rem' }}>Best practices.</h3>
                <button type="button" className="view-all">View all</button>
              </div>

              <div className="practice-grid">
                {PRACTICES.map((practice, index) => (
                  <button
                    key={practice.name}
                    type="button"
                    className="practice-card"
                    style={{ background: PRACTICE_COLORS[index % PRACTICE_COLORS.length] }}
                    onClick={() => fetchPracticeDetails(practice)}
                  >
                    <span className="practice-emoji">{practice.emoji}</span>
                    <span className="practice-name">{practice.name}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="section">
              <div className="section-head">
                <h3 className="section-title" style={{ fontSize: '1.4rem' }}>Expert advice.</h3>
                <button type="button" className="view-all">View all</button>
              </div>

              <div className="qa-row">
                {qaList.map((item, index) => (
                  <article key={`${item.question}-${item.date}`} className="qa-card">
                    <div className="qa-meta">
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <span className="avatar-dot">F</span>
                        Farmer
                      </span>
                      <span>{selectedCrop.name} • {item.date}</span>
                    </div>

                    <p className="qa-question">{item.question}</p>
                    <button type="button" className="link-like">Read more</button>

                    <div className="qa-expert">
                      <div className="expert-box">
                        <div className="expert-row">
                          <span className="expert-logo">KM</span>
                          <strong>KrishiMitra AI Expert</strong>
                          <span>{item.date}</span>
                        </div>
                        <p className="expert-preview">{item.answer}</p>
                        <button type="button" className="link-like" style={{ marginTop: '0.35rem' }}>
                          View full answer
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <button type="button" className="ask-btn" onClick={() => {
                setQueryModal(true);
                setQueryText('');
                setQueryAnswer('');
              }}>
                Ask query
              </button>
            </section>
          </>
        ) : null}
      </main>

      {practiceModal ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setPracticeModal(null)}>
          <section className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h4>{practiceModal.name} for {selectedCrop?.name}</h4>
              <button type="button" className="close-btn" onClick={() => setPracticeModal(null)}>×</button>
            </div>

            {practiceLoading ? <div className="spinner" /> : null}
            {!practiceLoading ? <pre className="practice-content">{practiceContent}</pre> : null}
          </section>
        </div>
      ) : null}

      {queryModal ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setQueryModal(false)}>
          <section className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h4>Ask an Expert</h4>
              <button type="button" className="close-btn" onClick={() => setQueryModal(false)}>×</button>
            </div>

            <p style={{ margin: '0.75rem 0 0.4rem', color: '#4b5563', fontSize: '0.88rem' }}>
              Crop: <strong>{selectedCrop?.name}</strong>
            </p>

            <textarea
              className="query-textarea"
              value={queryText}
              onChange={(event) => setQueryText(event.target.value)}
              placeholder="Describe your problem..."
            />

            <button type="button" className="submit-btn" onClick={submitExpertQuery} disabled={queryLoading}>
              {queryLoading ? 'Submitting...' : 'Submit Question'}
            </button>

            {queryLoading ? <div className="spinner" /> : null}

            {queryAnswer ? (
              <div style={{ marginTop: '0.9rem', background: '#f8fafc', borderRadius: '12px', padding: '0.8rem', border: '1px solid #e5e7eb' }}>
                <p style={{ margin: 0, fontWeight: 700, color: '#166534', fontSize: '0.9rem' }}>KrishiMitra AI Expert</p>
                <p style={{ margin: '0.5rem 0 0', whiteSpace: 'pre-wrap', color: '#374151', lineHeight: 1.5 }}>{queryAnswer}</p>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
