import Button from '../ui/Button';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';

export default function ReviewForm() {
  return (
    <form className="form">
      <Select label="Rating" defaultValue="5">
        <option value="5">5</option>
        <option value="4">4</option>
        <option value="3">3</option>
      </Select>
      <Textarea label="Comment" placeholder="Write a review..." />
      <Button type="button">Submit review</Button>
    </form>
  );
}
