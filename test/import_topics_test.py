import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('import_topics', Path(__file__).resolve().parents[1] / 'scripts/import_topics.py')
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)

class TopicImportTests(unittest.TestCase):
    def test_cis_uses_total_and_preserves_wrapped_labels_and_absence(self):
        rows = '\n'.join(f'   Topic {i}     1,0    2,0    3,0    6,0' for i in range(15))
        text = '¿Cuál es, a su juicio, el principal problema\n' + rows + '\n   Long label    1,0    2,0    3,0    6,0\n   continued label\n   Missing     -     -     -     -\nPregunta siguiente\n'
        parsed = module.pdf_rows(text, 'cis')
        self.assertEqual(parsed['Topic 0'], 6)
        self.assertEqual(parsed['Long label continued label'], 6)
        self.assertIsNone(parsed['Missing'])
    def test_ceo_uses_all_respondents_question_one_not_question_two(self):
        rows = '\n'.join(f'Topic {i}    200    10,0' for i in range(15))
        parsed = module.pdf_rows('1. En la seva opinió, quins creu\n' + rows + '\n2. Quin\nTopic 0    400    20,0', 'ceo')
        self.assertEqual(parsed['Topic 0'], 10)
    def test_unrecognized_shape_fails_closed(self):
        with self.assertRaises(ValueError): module.pdf_rows('1. En la seva opinió, quins creu\nUnexpected layout', 'ceo')
    def test_zero_is_measured_missing_is_not_zero(self):
        self.assertEqual(module.number('0,0'), 0)
        self.assertIsNone(module.number('-'))
        with self.assertRaises(ValueError): module.number('101')

if __name__ == '__main__': unittest.main()
