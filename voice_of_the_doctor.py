#Step1: Setup Text to Speech-TTs Model (gTTS & ElevenLabs)

#Step1.a: using gTTS

import os
from gtts import gTTS

def text_to_speech_with_gTTS_old(text, output_filepath ):
    language="en"

    audioobj=gTTS(
        text=input_text,
        lang=language,
        slow=False
    )
    audioobj.save(output_filepath)

# input_text="this is not a drill, this is a real emergency"
# text_to_speech_with_gTTS_old(input_text, output_filepath="gtts_testing.mp3")

#Step1.b: using ElevenLabs

# import elevenlabs
# from elevenlabs.client import ElevenLabs

# ELEVENLABS_API_KEY=os.environ.get("ELEVENLABS_API_KEY")

# def text_to_speech_with_elevenlabs_old(input_text, output_filepath):
#     client=ElevenLabs(api_key=ELEVENLABS_API_KEY)
#     audio=client.generate(
#         text= input_text ,
#         voice="Aria" ,
#         output_format="mp3_22050_32",
#         model= "eleven_turbo_v2"
#     )
#     elevenlabs.save(audio, output_filepath)

# text_to_speech_with_elevenlabs_old(input_text, output_filepath="elevenlabs_testing.mp3")


#Step2: USe Model for text output to voice
import subprocess
import platform

def text_to_speech_with_gTTS(input_text, output_filepath ):
    language="en"

    audioobj=gTTS(
        text=input_text,
        lang=language,
        slow=False
    )
    audioobj.save(output_filepath)
    os_name =platform.system()
    try:
        if  os_name == "Darwin":
            subprocess.run(['afplay',output_filepath])
        elif os_name == "Windows":
            subprocess.run(['powershell', '-c', f'(New-Object Media.Soundplayer "{output_filepath}").PlaySync();'])
        elif os_name == "Linux":
            subprocess.run(['aplay',output_filepath])
        else:
            raise OSError("Unsupported operation system")
    except Exception as e:
        print(f"Error playing audio: {e}")

    

# input_text="this is not a drill, this is a real emergency autoplayed"
# text_to_speech_with_gTTS(input_text, output_filepath="gtts_testing.mp3")


# def text_to_speech_with_elevenlabs(input_text, output_filepath):
#     client=ElevenLabs(api_key=ELEVENLABS_API_KEY)
#     audio=client.generate(
#         text= input_text ,
#         voice="Aria" ,
#         output_format="mp3_22050_32",
#         model= "eleven_turbo_v2"
#     )
#     elevenlabs.save(audio, output_filepath)
#     os_name =platform.system()
#     try:
#         if  os_name == "Darwin":
#             subprocess.run(['afplay',output_filepath])
#         elif os_name == "Windows":
#             subprocess.run(['powershell', '-c', f'(New-Object Media.Soundplayer "{output_filepath}").PlaySync();'])
#         elif os_name == "Linux":
#             subprocess.run(['aplay',output_filepath])
#         else:
#             raise OSError("Unsupported operation system")
#     except Exception as e:
#         print(f"Error playing audio: {e}")

# text_to_speech_with_elevenlabs(input_text, output_filepath="elevenlabs_testing_auto.mp3")
