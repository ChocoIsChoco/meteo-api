#!/usr/bin/python
from sense_hat import SenseHat
import os
import time
import random

BLACK = [0, 0, 0]
GRAY = [128, 128, 128]
WHITE = [255, 255, 255]
RED = [200, 0, 0]
GREEN = [0,220,0]
DARKGREEN = [0,150,0]
BLUE = [50,0,150]

print("Starting SnakeSense game")
time.sleep(1)


sense = SenseHat()
sense.clear()  # Blank the LED matrix

# 0, 0 = Top left
# 7, 7 = Bottom right
#UP_PIXELS = [[3, 0], [4, 0]]

speed=5
dx=1
dy=0
vie=1
snake=[]
snake=[[random.randint(2,5),random.randint(2,5),vie]]
score=False

def new_apple():
    global snake
    imax=1000
    while(imax>0):
        imax-=1
        print(imax)
        app=[random.randint(0,7),random.randint(0,7)]
        commun=False
        for p in snake:
            if ( p[0]==app[0] and p[1]==app[1] ):
                print("mal tombe")
                commun=True
                break

        if(commun==False):
            set_pixels(app, RED)
            return app

def set_pixels(p, col):
    sense.set_pixel(p[0], p[1], col[0], col[1], col[2])


def handle_event(event):
    global dx,dy
    if event.direction == "down":
        dx=0
        dy=1
    elif event.direction == "up":
        dx=0
        dy=-1
    elif event.direction == "left":
        dx=-1
        dy=0
    elif event.direction == "right":
        dx=1
        dy=0

def perdu():
    global snake, score
    print("perdu")
    for p in snake :
        set_pixels(p, BLUE)
    score=True
    return False

running = True
game = False
elapsed=0
while running:
    if score:
        sense.show_message(str(len(snake)))

    for event in sense.stick.get_events():
        #print("The joystick was {} {}".format(event.action, event.direction))
        if ( event.action == "pressed" and event.direction == "middle") :
            score=False
            sense.clear()
            game = True
            speed=5
            dx=1
            dy=0
            vie=1
            snake=[[random.randint(2,5),random.randint(2,5),vie]]
            set_pixels(snake[0], GREEN)
            apple=new_apple()
            print(len(snake))
        if event.action == "pressed" :
            handle_event(event)

    time.sleep(0.1)
    elapsed+=1

    if (elapsed%speed==0 and game):
        lastp=snake[-1]
        nx=lastp[0]+dx
        ny=lastp[1]+dy
        if(nx>7 or nx<0 or ny>7 or ny<0):
            game=perdu()
            continue
        hitmyself=False
        for p in snake :
            #print("test %d,%d avec %d,%d",(nx,p[0],ny,p[1]))
            if(nx == p[0] and ny == p[1]):
                hitmyself=True

        if(hitmyself):
            game=perdu()
            continue


        if(nx == apple[0] and ny == apple[1]):
            vie+=1
            if(len(snake)%5==0):
                speed=max(speed-1,0)
            for p in snake :
                p[2]+=1
            apple=new_apple()

        snake.append([nx,ny,vie])
        for p in snake :
            #print(p)
            if(p[2]==0):
                set_pixels(p, BLACK)
                snake.remove(p)
            else:
                set_pixels(p, GREEN)
                p[2]=p[2]-1
