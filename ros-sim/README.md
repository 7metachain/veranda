# Veranda ROS Sim (Virtuals Track)

A Gazebo + ROS 2 stack that plays a "match ceremony": a TurtleBot drives to
a cafe table and pauses, simulating picking up a flower for the matched
candidate. The recording is what `<CeremonyVideo />` plays in the frontend.

## Bring up

```bash
docker compose up -d
# rosbridge: ws://localhost:9090
```

Then trigger from the backend:

```bash
curl -X POST http://localhost:8080/api/v1/ceremony/trigger \
  -H 'content-type: application/json' \
  -d '{"candidate_agent_wallet":"VerandaCandidate111…"}'
```

## Topics

- `/veranda/match_confirmed` (`std_msgs/String`) — match id from backend
- `/cmd_vel` (`geometry_msgs/Twist`) — drive commands published by `pickup_flower.py`

## World

`world/veranda_cafe.world` includes the standard `turtlebot3_world` plus a
`cafe_table` model placed at `(1.5, 0, 0)`, with a flower mesh on top.
