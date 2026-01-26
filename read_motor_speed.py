from lerobot.motors.feetech import FeetechMotorsBus
from lerobot.motors.feetech import FeetechMotorsBusConfig

config = FeetechMotorsBusConfig(
    port="/dev/tty.usbmodem58760431551",
    motors={
        "shoulder_pan": [1, "sts3215"],
        "shoulder_lift": [2, "sts3215"],
        "elbow_flex": [3, "sts3215"],
        "wrist_flex": [4, "sts3215"],
        "wrist_roll": [5, "sts3215"],
        "gripper": [6, "sts3215"],
    },
)

bus = FeetechMotorsBus(config)
bus.connect()

print("=== Motor Speed Settings ===")
print("Maximum_Acceleration:", bus.read("Maximum_Acceleration"))
print("Present_Speed:", bus.read("Present_Speed"))

bus.disconnect()
