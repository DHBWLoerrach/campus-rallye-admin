import { useRecordContext } from "react-admin";
const TruncatedField = ({
  source,
  label,
  maxLength = 50,
}: {
  source: string;
  label: string;
  maxLength: number;
}) => {
  const record = useRecordContext();
  if (!record) return null;
  let text = record[source];
  if (!text) return null;
  if (text.length > maxLength) text = text.slice(0, maxLength) + "…";
  return text;
};

export default TruncatedField;
