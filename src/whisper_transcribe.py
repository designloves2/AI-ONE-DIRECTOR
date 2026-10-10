import sys
import json
import os
import warnings
warnings.filterwarnings('ignore')

import whisper

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'ok': False, 'error': 'No input file specified'}))
        sys.exit(1)

    audio_path = sys.argv[1]
    model_name = sys.argv[2] if len(sys.argv) > 2 else 'base'

    if not os.path.exists(audio_path):
        print(json.dumps({'ok': False, 'error': f'File not found: {audio_path}'}))
        sys.exit(1)

    try:
        model = whisper.load_model(model_name)
        result = model.transcribe(audio_path, language='ko', fp16=True)
        print(json.dumps({
            'ok': True,
            'text': result.get('text', '').strip(),
            'language': result.get('language', 'ko'),
            'segments': [
                {
                    'id': s.get('id'),
                    'start': s.get('start'),
                    'end': s.get('end'),
                    'text': s.get('text', '').strip()
                }
                for s in result.get('segments', [])
            ]
        }, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({'ok': False, 'error': str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()
