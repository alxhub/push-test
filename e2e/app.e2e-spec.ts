import { PushTestPage } from './app.po';

describe('push-test App', function() {
  let page: PushTestPage;

  beforeEach(() => {
    page = new PushTestPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
