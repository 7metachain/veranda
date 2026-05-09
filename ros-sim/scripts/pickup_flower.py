#!/usr/bin/env python3
"""
Subscribes to /veranda/match_confirmed. On each message:
  - publishes 5s of forward velocity on /cmd_vel
  - logs "Flower picked up for match {match_id}"

Triggered by the backend via rosbridge in `services/ros_bridge.rs`.
"""

import rclpy
from rclpy.node import Node
from std_msgs.msg import String
from geometry_msgs.msg import Twist


class PickupFlower(Node):
    def __init__(self):
        super().__init__("pickup_flower")
        self.cmd_vel = self.create_publisher(Twist, "/cmd_vel", 10)
        self.subscription = self.create_subscription(
            String,
            "/veranda/match_confirmed",
            self.on_match,
            10,
        )
        self.get_logger().info("pickup_flower ready, waiting for match_confirmed")

    def on_match(self, msg: String) -> None:
        match_id = msg.data
        self.get_logger().info(f"Match confirmed: {match_id}; driving to table")

        twist = Twist()
        twist.linear.x = 0.18
        for _ in range(50):  # ~5s at 10Hz
            self.cmd_vel.publish(twist)
            rclpy.spin_once(self, timeout_sec=0.1)

        twist.linear.x = 0.0
        self.cmd_vel.publish(twist)
        self.get_logger().info(f"Flower picked up for match {match_id}")


def main() -> None:
    rclpy.init()
    node = PickupFlower()
    try:
        rclpy.spin(node)
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
