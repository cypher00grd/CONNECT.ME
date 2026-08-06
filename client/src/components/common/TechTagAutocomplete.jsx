import SkillTagInput from './SkillTagInput';
import { TECH_STACK_SUGGESTIONS } from '../../utils/constants';

const DEFAULT_TECH_SUGGESTIONS = [
  ...TECH_STACK_SUGGESTIONS.languages,
  ...TECH_STACK_SUGGESTIONS.frameworks,
  ...TECH_STACK_SUGGESTIONS.tools,
  'auth',
  'jwt',
  'websocket',
  'system design',
  'dsa',
  'security',
];

const TechTagAutocomplete = ({
  label = 'Technology',
  value = [],
  onChange,
  placeholder = 'React, Docker, Auth...',
  max = 6,
  helperText,
}) => (
  <SkillTagInput
    label={label}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    max={max}
    suggestions={DEFAULT_TECH_SUGGESTIONS}
    helperText={helperText}
  />
);

export default TechTagAutocomplete;
